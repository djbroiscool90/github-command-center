package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
)

// ─── PR Detail Types ──────────────────────────────────────────────────────────

type PRDetail struct {
	Number         int        `json:"number"`
	Title          string     `json:"title"`
	State          string     `json:"state"`
	Body           string     `json:"body"`
	Draft          bool       `json:"draft"`
	Merged         bool       `json:"merged"`
	Mergeable      *bool      `json:"mergeable"`
	HTMLURL        string     `json:"html_url"`
	CreatedAt      string     `json:"created_at"`
	UpdatedAt      string     `json:"updated_at"`
	MergedAt       string     `json:"merged_at"`
	User           GitHubUser `json:"user"`
	Head           PRRef      `json:"head"`
	Base           PRRef      `json:"base"`
	Additions      int        `json:"additions"`
	Deletions      int        `json:"deletions"`
	ChangedFiles   int        `json:"changed_files"`
	Comments       int        `json:"comments"`
	ReviewComments int        `json:"review_comments"`
}

type PRRef struct {
	Ref  string `json:"ref"`
	SHA  string `json:"sha"`
	Repo struct {
		FullName string `json:"full_name"`
		HTMLURL  string `json:"html_url"`
	} `json:"repo"`
}

type PRFile struct {
	Filename    string `json:"filename"`
	Status      string `json:"status"` // added, removed, modified, renamed
	Additions   int    `json:"additions"`
	Deletions   int    `json:"deletions"`
	Changes     int    `json:"changes"`
	Patch       string `json:"patch"`
}

type PRComment struct {
	ID        int        `json:"id"`
	Body      string     `json:"body"`
	User      GitHubUser `json:"user"`
	CreatedAt string     `json:"created_at"`
	UpdatedAt string     `json:"updated_at"`
	HTMLURL   string     `json:"html_url"`
}

// ─── Issue Detail Types ───────────────────────────────────────────────────────

type IssueDetail struct {
	Number    int        `json:"number"`
	Title     string     `json:"title"`
	Body      string     `json:"body"`
	State     string     `json:"state"`
	HTMLURL   string     `json:"html_url"`
	CreatedAt string     `json:"created_at"`
	UpdatedAt string     `json:"updated_at"`
	ClosedAt  string     `json:"closed_at"`
	User      GitHubUser `json:"user"`
	Assignees []GitHubUser `json:"assignees"`
	Labels    []struct {
		ID    int    `json:"id"`
		Name  string `json:"name"`
		Color string `json:"color"`
	} `json:"labels"`
	Comments  int `json:"comments"`
	Milestone *struct {
		Title string `json:"title"`
	} `json:"milestone"`
}

type IssueComment struct {
	ID        int        `json:"id"`
	Body      string     `json:"body"`
	User      GitHubUser `json:"user"`
	CreatedAt string     `json:"created_at"`
	UpdatedAt string     `json:"updated_at"`
	HTMLURL   string     `json:"html_url"`
}

// ─── Workflow Types ───────────────────────────────────────────────────────────

type GitHubWorkflow struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	State     string `json:"state"`
	Path      string `json:"path"`
	HTMLURL   string `json:"html_url"`
	BadgeURL  string `json:"badge_url"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type WorkflowRun struct {
	ID              int        `json:"id"`
	Name            string     `json:"name"`
	Status          string     `json:"status"`
	Conclusion      string     `json:"conclusion"`
	Event           string     `json:"event"`
	HeadBranch      string     `json:"head_branch"`
	HeadSHA         string     `json:"head_sha"`
	RunNumber       int        `json:"run_number"`
	WorkflowID      int        `json:"workflow_id"`
	CreatedAt       string     `json:"created_at"`
	UpdatedAt       string     `json:"updated_at"`
	HTMLURL         string     `json:"html_url"`
	TriggerActor    GitHubUser `json:"triggering_actor"`
	RunDurationMS   int        `json:"run_duration_ms"`
}

// ─── Repo Content Types ───────────────────────────────────────────────────────

type RepoContent struct {
	Type        string `json:"type"` // file | dir
	Name        string `json:"name"`
	Path        string `json:"path"`
	SHA         string `json:"sha"`
	Size        int    `json:"size"`
	HTMLURL     string `json:"html_url"`
	DownloadURL string `json:"download_url"`
	Content     string `json:"content"`   // base64 encoded for files
	Encoding    string `json:"encoding"`
}

// ─── Proxy helper ─────────────────────────────────────────────────────────────

func proxyGitHub(w http.ResponseWriter, token, apiURL string) {
	resp, err := githubRequest(token, "GET", apiURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func githubPost(token, method, apiURL string, payload interface{}) (*http.Response, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest(method, apiURL, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	req.Header.Set("Content-Type", "application/json")
	return http.DefaultClient.Do(req)
}

// ─── PR Handlers ──────────────────────────────────────────────────────────────

func handleGetPRDetail(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%s", vars["owner"], vars["repo"], vars["number"])
	proxyGitHub(w, token, url)
}

func handleGetPRFiles(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%s/files?per_page=100", vars["owner"], vars["repo"], vars["number"])
	proxyGitHub(w, token, url)
}

func handleGetPRComments(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	// Get both issue comments and review comments
	issueURL := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%s/comments?per_page=100", vars["owner"], vars["repo"], vars["number"])
	proxyGitHub(w, token, issueURL)
}

func handleSubmitPRReview(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)

	var req struct {
		Body  string `json:"body"`
		Event string `json:"event"` // APPROVE | REQUEST_CHANGES | COMMENT
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%s/reviews", vars["owner"], vars["repo"], vars["number"])
	resp, err := githubPost(token, "POST", url, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func handleMergePR(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)

	var req struct {
		CommitTitle   string `json:"commit_title"`
		CommitMessage string `json:"commit_message"`
		MergeMethod   string `json:"merge_method"` // merge | squash | rebase
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.MergeMethod == "" {
		req.MergeMethod = "merge"
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls/%s/merge", vars["owner"], vars["repo"], vars["number"])
	resp, err := githubPost(token, "PUT", url, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// ─── Issue Handlers ───────────────────────────────────────────────────────────

func handleGetIssueDetail(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%s", vars["owner"], vars["repo"], vars["number"])
	proxyGitHub(w, token, url)
}

func handleGetIssueComments(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%s/comments?per_page=100", vars["owner"], vars["repo"], vars["number"])
	proxyGitHub(w, token, url)
}

func handleAddIssueComment(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)

	var req struct {
		Body string `json:"body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%s/comments", vars["owner"], vars["repo"], vars["number"])
	resp, err := githubPost(token, "POST", url, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func handleUpdateIssue(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)

	var req map[string]interface{} // flexible: title, body, state, labels, assignees
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues/%s", vars["owner"], vars["repo"], vars["number"])
	resp, err := githubPost(token, "PATCH", url, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func handleCreateIssue(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)

	var req struct {
		Title     string   `json:"title"`
		Body      string   `json:"body"`
		Labels    []string `json:"labels"`
		Assignees []string `json:"assignees"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/issues", vars["owner"], vars["repo"])
	resp, err := githubPost(token, "POST", url, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// ─── PR Creation Handlers ─────────────────────────────────────────────────────

func handleGetRepoBranches(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/branches?per_page=100", vars["owner"], vars["repo"])
	proxyGitHub(w, token, url)
}

func handleCreatePR(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)

	var req struct {
		Title               string `json:"title"`
		Body                string `json:"body"`
		Head                string `json:"head"`
		Base                string `json:"base"`
		Draft               bool   `json:"draft"`
		MaintainerCanModify bool   `json:"maintainer_can_modify"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/pulls", vars["owner"], vars["repo"])
	resp, err := githubPost(token, "POST", url, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// ─── Workflow Handlers ────────────────────────────────────────────────────────

func handleGetWorkflows(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/workflows?per_page=100", vars["owner"], vars["repo"])
	proxyGitHub(w, token, url)
}

func handleGetWorkflowRuns(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	branch := r.URL.Query().Get("branch")
	extra := ""
	if branch != "" {
		extra = "&branch=" + branch
	}
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs?per_page=30%s", vars["owner"], vars["repo"], extra)
	proxyGitHub(w, token, url)
}

func handleTriggerWorkflow(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)

	var req struct {
		Ref    string            `json:"ref"`
		Inputs map[string]string `json:"inputs"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if req.Ref == "" {
		req.Ref = "main"
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/workflows/%s/dispatches", vars["owner"], vars["repo"], vars["workflow_id"])
	resp, err := githubPost(token, "POST", url, req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	// 204 No Content on success
	if resp.StatusCode == http.StatusNoContent {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Workflow triggered successfully"})
		return
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func handleGetRunLogs(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)

	// GitHub returns a redirect to download the logs
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs/%s/logs", vars["owner"], vars["repo"], vars["run_id"])
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")

	// Don't follow redirect — return the redirect URL
	client := &http.Client{CheckRedirect: func(req *http.Request, via []*http.Request) error {
		return http.ErrUseLastResponse
	}}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusFound || resp.StatusCode == http.StatusSeeOther {
		redirectURL := resp.Header.Get("Location")
		// Fetch the actual log file
		logResp, err := http.Get(redirectURL)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		defer logResp.Body.Close()
		logBody, _ := io.ReadAll(logResp.Body)
		// Logs are a zip file — return as text for display (first 50KB)
		logText := string(logBody)
		if len(logText) > 50000 {
			logText = logText[:50000] + "\n...(truncated)"
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"logs": logText})
		return
	}

	// Job-level logs (text format)
	body, _ := io.ReadAll(resp.Body)
	logText := string(body)
	if len(logText) > 50000 {
		logText = logText[:50000] + "\n...(truncated)"
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"logs": logText})
}

func handleGetRunJobs(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/actions/runs/%s/jobs?per_page=30", vars["owner"], vars["repo"], vars["run_id"])
	proxyGitHub(w, token, url)
}

// ─── File Browser Handlers ────────────────────────────────────────────────────

func handleGetRepoContents(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	path := r.URL.Query().Get("path")
	ref := r.URL.Query().Get("ref")

	apiPath := ""
	if path != "" {
		apiPath = "/" + strings.TrimPrefix(path, "/")
	}
	extra := ""
	if ref != "" {
		extra = "?ref=" + ref
	}

	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/contents%s%s", vars["owner"], vars["repo"], apiPath, extra)
	proxyGitHub(w, token, url)
}

// ─── User Repos for PR/Issue creation (list user repos) ──────────────────────

func handleGetUserReposForSelect(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	// Returns owner/repo name pairs only
	resp, err := githubRequest(token, "GET", "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var repos []struct {
		FullName string `json:"full_name"`
		Name     string `json:"name"`
		Private  bool   `json:"private"`
	}
	json.NewDecoder(resp.Body).Decode(&repos)

	type slim struct {
		FullName string `json:"full_name"`
		Name     string `json:"name"`
		Private  bool   `json:"private"`
	}
	result := make([]slim, len(repos))
	for i, r := range repos {
		result[i] = slim{FullName: r.FullName, Name: r.Name, Private: r.Private}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// ─── Repo Labels ──────────────────────────────────────────────────────────────

func handleGetRepoLabels(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/labels?per_page=100", vars["owner"], vars["repo"])
	proxyGitHub(w, token, url)
}

// ─── Star/Watch/Fork ──────────────────────────────────────────────────────────

func handleStarRepo(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	method := "PUT"
	if r.Method == "DELETE" {
		method = "DELETE"
	}
	url := fmt.Sprintf("https://api.github.com/user/starred/%s/%s", vars["owner"], vars["repo"])
	req, _ := http.NewRequest(method, url, nil)
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	if resp.StatusCode == http.StatusNoContent {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "ok"})
		return
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func handleCheckStarred(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	url := fmt.Sprintf("https://api.github.com/user/starred/%s/%s", vars["owner"], vars["repo"])
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization", "token "+token)
	req.Header.Set("Accept", "application/vnd.github.v3+json")
	resp, _ := http.DefaultClient.Do(req)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"starred": resp != nil && resp.StatusCode == http.StatusNoContent})
}

// ─── Mark notification as read ────────────────────────────────────────────────

func handleMarkNotificationRead(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	url := fmt.Sprintf("https://api.github.com/notifications/threads/%s", vars["id"])
	resp, err := githubPost(token, "PATCH", url, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Marked as read"})
}

// ─── Search ───────────────────────────────────────────────────────────────────

func handleSearch(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	q := r.URL.Query().Get("q")
	searchType := r.URL.Query().Get("type") // repositories | issues | code
	if searchType == "" {
		searchType = "repositories"
	}
	if q == "" {
		http.Error(w, "Missing query", http.StatusBadRequest)
		return
	}
	url := fmt.Sprintf("https://api.github.com/search/%s?q=%s&per_page=20", searchType, q)
	proxyGitHub(w, token, url)
}

// ─── Fork Repo ────────────────────────────────────────────────────────────────

func handleForkRepo(w http.ResponseWriter, r *http.Request) {
	token := getToken(r)
	if token == "" {
		http.Error(w, "Missing token", http.StatusUnauthorized)
		return
	}
	vars := mux.Vars(r)
	url := fmt.Sprintf("https://api.github.com/repos/%s/%s/forks", vars["owner"], vars["repo"])
	resp, err := githubPost(token, "POST", url, map[string]interface{}{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// Ensure strconv is used
var _ = strconv.Itoa
