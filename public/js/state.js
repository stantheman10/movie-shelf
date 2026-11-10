// Single shared, mutable UI state. Modules mutate it and then call render().
export const state = {
  reqId: 0,            // bumped by every request that replaces the view; lets stale responses be dropped
  tab: "search", smart: false, // smart: natural-language search (signed-in only)
 
  trending: null, // { movies, tv } for the home screen
  results: [], query: "", page: 0, totalPages: 0, loadingMore: false,
  detail: null, msg: "", user: null, lib: {},
};
