const SEARCH_AUTH_SESSION_KEY = "alive-search-authorized"

export function isSearchAuthorizedInSession() {
  if (typeof window === "undefined") {
    return false
  }

  return window.sessionStorage.getItem(SEARCH_AUTH_SESSION_KEY) === "true"
}

export function setSearchAuthorizedInSession(authorized: boolean) {
  if (typeof window === "undefined") {
    return
  }

  if (authorized) {
    window.sessionStorage.setItem(SEARCH_AUTH_SESSION_KEY, "true")
    return
  }

  window.sessionStorage.removeItem(SEARCH_AUTH_SESSION_KEY)
}
