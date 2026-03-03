package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func init() {
	godotenv.Load()
}

func main() {
	router := mux.NewRouter()

	// Add CORS headers
	router.Use(corsMiddleware)

	// App config endpoint (returns pre-configured credentials from .env)
	router.HandleFunc("/api/config", handleGetConfig).Methods("GET")

	// GitHub API endpoints
	router.HandleFunc("/api/github/user", handleGitHubUser).Methods("GET")
	router.HandleFunc("/api/github/pulls", handleGitHubPulls).Methods("GET")
	router.HandleFunc("/api/github/issues", handleGitHubIssues).Methods("GET")
	router.HandleFunc("/api/github/repos", handleGitHubRepos).Methods("GET")
	router.HandleFunc("/api/github/events", handleGitHubEvents).Methods("GET")
	router.HandleFunc("/api/github/ratelimit", handleGitHubRateLimit).Methods("GET")
	router.HandleFunc("/api/github/notifications", handleGitHubNotifications).Methods("GET")

	// Git endpoints
	router.HandleFunc("/api/git/clone", handleCloneRepo).Methods("POST")
	router.HandleFunc("/api/git/add", handleAddRepo).Methods("POST")
	router.HandleFunc("/api/git/branches/{repoPath}", handleGetBranches).Methods("GET")
	router.HandleFunc("/api/git/branches/{repoPath}", handleDeleteBranch).Methods("DELETE")
	router.HandleFunc("/api/git/status/{repoPath}", handleGetStatus).Methods("GET")
	router.HandleFunc("/api/git/commit/{repoPath}", handleCommit).Methods("POST")
	router.HandleFunc("/api/git/branch/{repoPath}", handleCreateBranch).Methods("POST")
	router.HandleFunc("/api/git/checkout/{repoPath}", handleCheckoutBranch).Methods("POST")
	router.HandleFunc("/api/git/merge/{repoPath}", handleMergeBranch).Methods("POST")
	router.HandleFunc("/api/git/stage/{repoPath}", handleStageFile).Methods("POST")
	router.HandleFunc("/api/git/unstage/{repoPath}", handleUnstageFile).Methods("POST")
	router.HandleFunc("/api/git/history/{repoPath}", handleGetCommitHistory).Methods("GET")
	router.HandleFunc("/api/git/stash/{repoPath}", handleCreateStash).Methods("POST")
	router.HandleFunc("/api/git/stashes/{repoPath}", handleListStashes).Methods("GET")
	router.HandleFunc("/api/git/apply-stash/{repoPath}", handleApplyStash).Methods("POST")
	router.HandleFunc("/api/git/stash/{repoPath}", handleDeleteStash).Methods("DELETE")
	router.HandleFunc("/api/git/push/{repoPath}", handlePush).Methods("POST")
	router.HandleFunc("/api/git/pull/{repoPath}", handlePull).Methods("POST")
	router.HandleFunc("/api/git/sync/{repoPath}", handleSync).Methods("POST")
	router.HandleFunc("/api/git/clean/{repoPath}", handleClean).Methods("POST")
	router.HandleFunc("/api/git/diff/{repoPath}", handleGetDiff).Methods("GET")

	// PR inline panel endpoints
	router.HandleFunc("/api/github/pr/{owner}/{repo}/{number}", handleGetPRDetail).Methods("GET")
	router.HandleFunc("/api/github/pr/{owner}/{repo}/{number}/files", handleGetPRFiles).Methods("GET")
	router.HandleFunc("/api/github/pr/{owner}/{repo}/{number}/comments", handleGetPRComments).Methods("GET")
	router.HandleFunc("/api/github/pr/{owner}/{repo}/{number}/review", handleSubmitPRReview).Methods("POST")
	router.HandleFunc("/api/github/pr/{owner}/{repo}/{number}/merge", handleMergePR).Methods("PUT")

	// Issue inline panel endpoints
	router.HandleFunc("/api/github/issue/{owner}/{repo}/{number}", handleGetIssueDetail).Methods("GET")
	router.HandleFunc("/api/github/issue/{owner}/{repo}/{number}/comments", handleGetIssueComments).Methods("GET")
	router.HandleFunc("/api/github/issue/{owner}/{repo}/{number}/comment", handleAddIssueComment).Methods("POST")
	router.HandleFunc("/api/github/issue/{owner}/{repo}/{number}", handleUpdateIssue).Methods("PATCH")
	router.HandleFunc("/api/github/repo/{owner}/{repo}/issues", handleCreateIssue).Methods("POST")

	// PR/Issue creation helpers
	router.HandleFunc("/api/github/repo/{owner}/{repo}/branches", handleGetRepoBranches).Methods("GET")
	router.HandleFunc("/api/github/repo/{owner}/{repo}/pulls", handleCreatePR).Methods("POST")
	router.HandleFunc("/api/github/repo/{owner}/{repo}/labels", handleGetRepoLabels).Methods("GET")
	router.HandleFunc("/api/github/repos/select", handleGetUserReposForSelect).Methods("GET")

	// Workflow endpoints
	router.HandleFunc("/api/github/workflows/{owner}/{repo}", handleGetWorkflows).Methods("GET")
	router.HandleFunc("/api/github/workflows/{owner}/{repo}/runs", handleGetWorkflowRuns).Methods("GET")
	router.HandleFunc("/api/github/workflows/{owner}/{repo}/{workflow_id}/dispatch", handleTriggerWorkflow).Methods("POST")
	router.HandleFunc("/api/github/runs/{owner}/{repo}/{run_id}/jobs", handleGetRunJobs).Methods("GET")
	router.HandleFunc("/api/github/runs/{owner}/{repo}/{run_id}/logs", handleGetRunLogs).Methods("GET")

	// File browser
	router.HandleFunc("/api/github/repo/{owner}/{repo}/contents", handleGetRepoContents).Methods("GET")

	// Star / fork
	router.HandleFunc("/api/github/star/{owner}/{repo}", handleStarRepo).Methods("PUT", "DELETE")
	router.HandleFunc("/api/github/starred/{owner}/{repo}", handleCheckStarred).Methods("GET")
	router.HandleFunc("/api/github/fork/{owner}/{repo}", handleForkRepo).Methods("POST")

	// Notifications
	router.HandleFunc("/api/github/notifications/{id}/read", handleMarkNotificationRead).Methods("PATCH")

	// Search
	router.HandleFunc("/api/github/search", handleSearch).Methods("GET")

	// Serve React app
	distDir := "./dist"
	if _, err := os.Stat(distDir); os.IsNotExist(err) {
		distDir = "../dist"
	}
	router.PathPrefix("/").Handler(mimeTypeHandler(http.FileServer(http.Dir(distDir))))

	port := ":8765"
	log.Println("GitHub Command Center backend starting on", port)
	if err := http.ListenAndServe(port, router); err != nil {
		log.Fatal(err)
	}
}

func handleGetConfig(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	token := os.Getenv("GITHUB_TOKEN")
	username := os.Getenv("GITHUB_USERNAME")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"github_token":    token,
		"github_username": username,
		"auto_configured": token != "",
	})
}

func mimeTypeHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, ".css"):
			w.Header().Set("Content-Type", "text/css; charset=utf-8")
		case strings.HasSuffix(r.URL.Path, ".js"):
			w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
		case strings.HasSuffix(r.URL.Path, ".html"):
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
		case strings.HasSuffix(r.URL.Path, ".json"):
			w.Header().Set("Content-Type", "application/json")
		case strings.HasSuffix(r.URL.Path, ".png"):
			w.Header().Set("Content-Type", "image/png")
		case strings.HasSuffix(r.URL.Path, ".jpg") || strings.HasSuffix(r.URL.Path, ".jpeg"):
			w.Header().Set("Content-Type", "image/jpeg")
		case strings.HasSuffix(r.URL.Path, ".svg"):
			w.Header().Set("Content-Type", "image/svg+xml")
		case strings.HasSuffix(r.URL.Path, ".woff2"):
			w.Header().Set("Content-Type", "font/woff2")
		}
		next.ServeHTTP(w, r)
	})
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func runGitCommand(repoPath string, args ...string) (string, error) {
	cmd := exec.Command("git", args...)
	cmd.Dir = repoPath
	output, err := cmd.CombinedOutput()
	return strings.TrimSpace(string(output)), err
}

func handleCloneRepo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var req struct {
		URL  string `json:"url"`
		Path string `json:"path"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	cmd := exec.Command("git", "clone", req.URL, req.Path)
	if err := cmd.Run(); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Cloned %s to %s", req.URL, req.Path),
	})
}

func handleAddRepo(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var req struct {
		Path string `json:"path"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if _, err := runGitCommand(req.Path, "rev-parse", "--git-dir"); err != nil {
		http.Error(w, "Not a valid git repository", http.StatusBadRequest)
		return
	}

	name := filepath.Base(req.Path)
	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Added repository at %s", req.Path),
		"name":    name,
	})
}

func handleGetBranches(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	branchesOutput, _ := runGitCommand(repoPath, "branch", "--format=%(refname:short)")
	headOutput, _ := runGitCommand(repoPath, "rev-parse", "--abbrev-ref", "HEAD")
	currentBranch := strings.TrimSpace(headOutput)

	var branches []map[string]interface{}
	for _, line := range strings.Split(branchesOutput, "\n") {
		name := strings.TrimSpace(line)
		if name == "" {
			continue
		}
		branches = append(branches, map[string]interface{}{
			"name":       name,
			"is_current": name == currentBranch,
			"is_remote":  false,
		})
	}

	if branches == nil {
		branches = []map[string]interface{}{}
	}
	json.NewEncoder(w).Encode(branches)
}

func handleDeleteBranch(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	var req struct {
		BranchName string `json:"branchName"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := runGitCommand(repoPath, "branch", "-d", req.BranchName)
	if err != nil {
		// Try force delete
		_, err = runGitCommand(repoPath, "branch", "-D", req.BranchName)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Deleted branch %s", req.BranchName),
	})
}

func handleMergeBranch(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	var req struct {
		BranchName string `json:"branchName"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	output, err := runGitCommand(repoPath, "merge", req.BranchName, "--no-ff")
	if err != nil {
		http.Error(w, fmt.Sprintf("Merge failed: %s", output), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Merged %s successfully", req.BranchName),
	})
}

func handleGetStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	statusOutput, err := runGitCommand(repoPath, "status", "--porcelain")
	if err != nil {
		json.NewEncoder(w).Encode([]map[string]string{})
		return
	}

	var files []map[string]string
	for _, line := range strings.Split(statusOutput, "\n") {
		if line == "" || len(line) < 3 {
			continue
		}
		xy := line[:2]
		path := strings.TrimSpace(line[3:])

		statusStr := "unknown"
		switch {
		case strings.Contains(xy, "M"):
			statusStr = "modified"
		case strings.Contains(xy, "A"):
			statusStr = "added"
		case strings.Contains(xy, "D"):
			statusStr = "deleted"
		case xy == "??":
			statusStr = "untracked"
		case strings.Contains(xy, "R"):
			statusStr = "renamed"
		}

		files = append(files, map[string]string{
			"path":   path,
			"status": statusStr,
		})
	}

	if files == nil {
		files = []map[string]string{}
	}
	json.NewEncoder(w).Encode(files)
}

func handleCommit(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	var req struct {
		Message string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Message == "" {
		http.Error(w, "Commit message is required", http.StatusBadRequest)
		return
	}

	_, err := runGitCommand(repoPath, "commit", "-m", req.Message)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Commit successful"})
}

func handleCreateBranch(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	var req struct {
		BranchName string `json:"branchName"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := runGitCommand(repoPath, "checkout", "-b", req.BranchName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Created and checked out branch %s", req.BranchName),
	})
}

func handleCheckoutBranch(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	var req struct {
		BranchName string `json:"branchName"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := runGitCommand(repoPath, "checkout", req.BranchName)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Checked out branch %s", req.BranchName),
	})
}

func handleStageFile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	var req struct {
		FilePath string `json:"filePath"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	filePath := req.FilePath
	if filePath == "" {
		filePath = "."
	}

	_, err := runGitCommand(repoPath, "add", filePath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	json.NewEncoder(w).Encode(map[string]string{"message": "File(s) staged successfully"})
}

func handleUnstageFile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	var req struct {
		FilePath string `json:"filePath"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	runGitCommand(repoPath, "reset", "HEAD", req.FilePath)
	json.NewEncoder(w).Encode(map[string]string{"message": "File unstaged"})
}

func handleGetCommitHistory(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]
	branch := r.URL.Query().Get("branch")
	if branch == "" {
		branch = "HEAD"
	}

	historyOutput, _ := runGitCommand(repoPath, "log", branch, "--pretty=format:%H|%s|%an|%at", "-50")

	var commits []map[string]interface{}
	for _, line := range strings.Split(historyOutput, "\n") {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 4)
		if len(parts) >= 4 {
			commits = append(commits, map[string]interface{}{
				"oid":       parts[0],
				"message":   parts[1],
				"author":    parts[2],
				"timestamp": parts[3],
			})
		}
	}

	if commits == nil {
		commits = []map[string]interface{}{}
	}
	json.NewEncoder(w).Encode(commits)
}

func handleCreateStash(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	var req struct {
		Name    string `json:"name"`
		Message string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	stashMessage := req.Name
	if req.Message != "" {
		stashMessage = fmt.Sprintf("%s: %s", req.Name, req.Message)
	}
	_, err := runGitCommand(repoPath, "stash", "push", "-u", "-m", stashMessage)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Stash created successfully"})
}

func handleListStashes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	stashOutput, _ := runGitCommand(repoPath, "stash", "list", "--pretty=format:%gd|%s|%ai")

	var stashes []map[string]interface{}
	for i, line := range strings.Split(stashOutput, "\n") {
		if line == "" {
			continue
		}
		parts := strings.SplitN(line, "|", 3)
		ref := parts[0]
		message := ""
		timestamp := ""
		if len(parts) > 1 {
			message = parts[1]
		}
		if len(parts) > 2 {
			timestamp = parts[2]
		}

		stashes = append(stashes, map[string]interface{}{
			"id":        fmt.Sprintf("%d", i),
			"name":      ref,
			"message":   message,
			"timestamp": timestamp,
		})
	}

	if stashes == nil {
		stashes = []map[string]interface{}{}
	}
	json.NewEncoder(w).Encode(stashes)
}

func handleApplyStash(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	var req struct {
		StashIndex int `json:"stashIndex"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	stashRef := fmt.Sprintf("stash@{%d}", req.StashIndex)
	output, err := runGitCommand(repoPath, "stash", "apply", stashRef)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to apply stash: %s", output), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": fmt.Sprintf("Stash %s applied", stashRef)})
}

func handleDeleteStash(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	var req struct {
		StashIndex int `json:"stashIndex"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	stashRef := fmt.Sprintf("stash@{%d}", req.StashIndex)
	output, err := runGitCommand(repoPath, "stash", "drop", stashRef)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to delete stash: %s", output), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": fmt.Sprintf("Stash %s deleted", stashRef)})
}

func handlePush(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	var req struct {
		Remote string `json:"remote"`
		Branch string `json:"branch"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	remote := req.Remote
	if remote == "" {
		remote = "origin"
	}

	args := []string{"push", remote}
	if req.Branch != "" {
		args = append(args, req.Branch)
	}

	output, err := runGitCommand(repoPath, args...)
	if err != nil {
		http.Error(w, fmt.Sprintf("Push failed: %s", output), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Pushed successfully"})
}

func handlePull(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	output, err := runGitCommand(repoPath, "pull")
	if err != nil {
		http.Error(w, fmt.Sprintf("Pull failed: %s", output), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Pulled successfully"})
}

func handleSync(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	// Fetch all remotes
	fetchOutput, err := runGitCommand(repoPath, "fetch", "--all", "--prune")
	if err != nil {
		http.Error(w, fmt.Sprintf("Fetch failed: %s", fetchOutput), http.StatusBadRequest)
		return
	}

	// Pull with rebase
	pullOutput, err := runGitCommand(repoPath, "pull", "--rebase")
	if err != nil {
		http.Error(w, fmt.Sprintf("Pull failed: %s", pullOutput), http.StatusBadRequest)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{
		"message": fmt.Sprintf("Synced successfully. %s", strings.TrimSpace(pullOutput)),
	})
}

func handleClean(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]

	// Get list of local branches that have been merged into the default branch
	mainBranch := "main"
	headOutput, _ := runGitCommand(repoPath, "symbolic-ref", "refs/remotes/origin/HEAD")
	if headOutput != "" {
		parts := strings.Split(headOutput, "/")
		if len(parts) > 0 {
			mainBranch = parts[len(parts)-1]
		}
	}

	// List merged branches (excluding current, main, master, develop)
	mergedOutput, _ := runGitCommand(repoPath, "branch", "--merged", mainBranch)
	var deleted []string
	for _, line := range strings.Split(mergedOutput, "\n") {
		branch := strings.TrimSpace(strings.TrimPrefix(line, "*"))
		branch = strings.TrimSpace(branch)
		if branch == "" || branch == mainBranch || branch == "master" || branch == "develop" || branch == "main" {
			continue
		}
		_, err := runGitCommand(repoPath, "branch", "-d", branch)
		if err == nil {
			deleted = append(deleted, branch)
		}
	}

	msg := "No merged branches to clean up"
	if len(deleted) > 0 {
		msg = fmt.Sprintf("Cleaned up %d merged branch(es): %s", len(deleted), strings.Join(deleted, ", "))
	}

	json.NewEncoder(w).Encode(map[string]string{"message": msg})
}

func handleGetDiff(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	vars := mux.Vars(r)
	repoPath := vars["repoPath"]
	filePath := r.URL.Query().Get("file")

	var output string
	if filePath != "" {
		output, _ = runGitCommand(repoPath, "diff", "HEAD", "--", filePath)
		if output == "" {
			output, _ = runGitCommand(repoPath, "diff", "--cached", "--", filePath)
		}
	} else {
		output, _ = runGitCommand(repoPath, "diff", "HEAD")
	}

	json.NewEncoder(w).Encode(map[string]string{"diff": output})
}
