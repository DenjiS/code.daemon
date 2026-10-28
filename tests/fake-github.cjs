// Preloaded into render.cjs by render.test.cjs: a fixed clock and a fake GitHub GraphQL API.
// FAKE_REPOS: JSON {name: {private, ci, commits: [{oid, t}]}}; FAIL: comma-separated repos that answer 502.
const NOW = +process.env.FAKE_NOW, RealDate = Date;
Date.now = () => NOW;
const repos = JSON.parse(process.env.FAKE_REPOS);
const fail = new Set((process.env.FAIL || '').split(',').filter(Boolean));
global.fetch = async (url, opts) => {
  const {query, variables: v} = JSON.parse(opts.body);
  const json = data => ({status: 200, ok: true, json: async () => ({data})});
  if (query.includes('contributionsCollection')) return json({user: {id: 'U1', login: 'me',
    contributionsCollection: {commitContributionsByRepository: Object.keys(repos).map(n => ({repository: {nameWithOwner: n}}))},
    repositories: {nodes: []}}});
  const name = v.owner + '/' + v.name, r = repos[name];
  if (fail.has(name)) return {status: 502, ok: false, json: async () => ({message: 'bad gateway'})};
  const since = RealDate.parse(v.since);
  const nodes = r.commits.filter(c => c.t >= since).sort((a, b) => b.t - a.t)
    .map(c => ({oid: c.oid, authoredDate: new RealDate(c.t).toISOString(), messageHeadline: 'work'}));
  return json({repository: {isPrivate: !!r.private, object: {entries: []}, releases: {nodes: []}, refs: {nodes: [{name: 'main', target: {
    committedDate: new RealDate(r.commits[r.commits.length - 1].t).toISOString(), statusCheckRollup: {state: r.ci || 'SUCCESS'},
    history: {pageInfo: {hasNextPage: false, endCursor: null}, nodes}}}]}}});
};
