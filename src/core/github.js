/* ---------- GitHub (GraphQL) ---------- */
'use strict';
const {ciFromRollup} = require('./ci');
const {commitKey, detectKind, toSessions} = require('./sessions');

const Q_REPO = `query($owner:String!,$name:String!,$since:GitTimestamp!,$uid:ID!){repository(owner:$owner,name:$name){isPrivate object(expression:"HEAD:"){... on Tree{entries{name type}}} refs(refPrefix:"refs/heads/",first:20,orderBy:{field:TAG_COMMIT_DATE,direction:DESC}){nodes{name target{... on Commit{committedDate statusCheckRollup{state} history(first:100,since:$since,author:{id:$uid}){pageInfo{hasNextPage endCursor} nodes{oid authoredDate messageHeadline}}}}}} releases(first:10,orderBy:{field:CREATED_AT,direction:DESC}){nodes{publishedAt}}}}`;
const Q_HIST = `query($owner:String!,$name:String!,$ref:String!,$since:GitTimestamp!,$uid:ID!,$cursor:String){repository(owner:$owner,name:$name){ref(qualifiedName:$ref){target{... on Commit{history(first:100,after:$cursor,since:$since,author:{id:$uid}){pageInfo{hasNextPage endCursor} nodes{oid authoredDate messageHeadline}}}}}}}`;
const HISTORY_PAGES = 30;  // per branch, 100 commits each
async function scanGitHubRepo(gql, nameWithOwner, since, uid, overrides) {
  const parts = nameWithOwner.split('/');
  const vars = {owner: parts[0], name: parts[1], since: new Date(since).toISOString(), uid};
  const d = await gql(Q_REPO, vars);
  const r = d && d.repository;
  if (!r) return null;
  const entries = ((r.object && r.object.entries) || []).map(e => ({name: e.name, dir: e.type === 'tree'}));
  const kind = detectKind(entries) || 'github';
  const seen = new Map(), oids = new Set();
  const add = nodes => {
    let fresh = 0;
    for (const c of nodes) {
      if (!c || oids.has(c.oid)) continue;
      oids.add(c.oid); fresh++;
      const t = Date.parse(c.authoredDate), msg = c.messageHeadline || '', key = commitKey(t, msg);
      if (!seen.has(key)) seen.set(key, {oid: c.oid, t, msg});
    }
    return fresh;
  };
  let head = null;
  const more = [];
  for (const ref of (r.refs && r.refs.nodes) || []) {
    const t = ref && ref.target;
    if (!t) continue;
    const h = t.history || {}, nodes = h.nodes || [];
    const fresh = add(nodes);
    if (fresh && h.pageInfo && h.pageInfo.hasNextPage && ref.name) more.push({ref: 'refs/heads/' + ref.name, cursor: h.pageInfo.endCursor});
    const at = Date.parse(t.committedDate);
    if (nodes.length && Number.isFinite(at) && (!head || at > head.at)) head = {at, ref: ref.name, s: ciFromRollup(t.statusCheckRollup && t.statusCheckRollup.state)};
  }
  // Older pages. Branches share most of their history, so a branch stops as soon as a page brings nothing new.
  for (const b of more) {
    let cursor = b.cursor;
    for (let page = 1; page < HISTORY_PAGES && cursor; page++) {
      const x = await gql(Q_HIST, Object.assign({}, vars, {ref: b.ref, cursor}));
      const h = x && x.repository && x.repository.ref && x.repository.ref.target && x.repository.ref.target.history;
      if (!h || !add(h.nodes || [])) break;
      cursor = h.pageInfo && h.pageInfo.hasNextPage ? h.pageInfo.endCursor : null;
    }
  }
  const commits = [...seen.values()].filter(c => Number.isFinite(c.t) && c.t >= since);
  if (!commits.length) return null;
  const rel = ((r.releases && r.releases.nodes) || []).map(x => Date.parse(x.publishedAt)).filter(Number.isFinite);
  const repo = {key: 'gh:' + nameWithOwner, name: nameWithOwner, prov: 'gh', kind, private: !!r.isPrivate, last: Math.max(...commits.map(c => c.t))};
  return {repo, sessions: toSessions(repo, commits, rel, overrides), ci: head && head.s ? {s: head.s, at: head.at, ref: head.ref} : null};
}

module.exports = {Q_REPO, Q_HIST, scanGitHubRepo};
