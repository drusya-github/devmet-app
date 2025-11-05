# ✅ GitHub Setup Checklist

Follow these steps to get your tasks on GitHub Issues and Project Board.

---

## 📝 Step-by-Step Instructions

### ☐ Step 1: Create GitHub Personal Access Token (2 minutes)

1. Open: https://github.com/settings/tokens
2. Click: **"Generate new token"** → **"Generate new token (classic)"**
3. **Name**: `DevMetrics Task Creator`
4. **Expiration**: 90 days (or your preference)
5. **Scopes** - Check these boxes:
   - ✅ `repo` - Full control of private repositories
     - (This will auto-select all repo sub-items)
   - ✅ `project` - Full control of projects
6. Click: **"Generate token"** (green button at bottom)
7. **COPY THE TOKEN** - You'll only see it once!
   ```
   ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   
**Save it somewhere safe temporarily** (you'll need it in Step 3)

---

### ☐ Step 2: Create/Verify GitHub Repository (5 minutes)

**Option A: If you already have a GitHub account but no repo for this project**

1. Go to: https://github.com/new
2. **Repository name**: `devmet-app`
3. **Description**: DevMetrics - Real-time Development Analytics Platform
4. **Visibility**: Public (recommended for portfolio) or Private
5. **DO NOT** initialize with README, .gitignore, or license (you have these already)
6. Click: **"Create repository"**
7. Copy the repository URL: `https://github.com/YOUR_USERNAME/devmet-app`

**Then, link your local code to GitHub:**

```bash
cd /Users/chandradrusya/Desktop/devmet-app

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/devmet-app.git

# Check current files
git status

# Add everything
git add .

# Commit
git commit -m "Initial commit: Task specifications and project structure"

# Push to GitHub
git push -u origin main

# If that fails with "main doesn't exist", try:
git branch -M main
git push -u origin main
```

**Option B: If the repo already exists**

Just make sure it's pushed to GitHub:
```bash
cd /Users/chandradrusya/Desktop/devmet-app
git push
```

---

### ☐ Step 3: Set Up Environment Variables (1 minute)

Open your terminal and run:

```bash
# Set your GitHub token (paste the token from Step 1)
export GITHUB_TOKEN="ghp_your_token_here"

# Set your GitHub username (lowercase, no @)
export GITHUB_OWNER="your_github_username"

# Verify they're set correctly
echo "Token (last 4 chars): ...${GITHUB_TOKEN: -4}"
echo "Owner: $GITHUB_OWNER"
```

**Example:**
```bash
export GITHUB_TOKEN="ghp_abc123xyz456..."
export GITHUB_OWNER="chandradrusya"
```

**Note**: These variables only last for your current terminal session. If you close terminal, you'll need to set them again.

---

### ☐ Step 4: Run the Setup Script (2 minutes)

```bash
# Navigate to your project
cd /Users/chandradrusya/Desktop/devmet-app

# Run the Python script
python3 scripts/create_github_tasks.py
```

**Expected output:**
```
🚀 DevMetrics GitHub Task Creator

============================================================
📦 Repository: your_username/devmet-app
🔑 Token: ********************xxxx

📌 Creating labels...

✓ Created label: P0-Critical
✓ Created label: P1-High
✓ Created label: P2-Medium
✓ Created label: P3-Low
... (more labels)

📋 Creating Sprint 1 issues (3 tasks)...

✓ Created issue #1: [TASK-001] Install and Configure PostgreSQL
✓ Created issue #2: [TASK-002] Install and Configure Redis
✓ Created issue #3: [TASK-003] Initialize API Project Structure

📊 Creating project board...
✓ Created project board: DevMetrics Development
  URL: https://github.com/users/your_username/projects/1

============================================================
✅ Summary:
   - Labels created: 24
   - Issues created: 3
   - Project board created: DevMetrics Development
   - Project URL: https://github.com/users/your_username/projects/1

📌 Next steps:
   1. Visit your repository issues tab
   2. Organize issues in the project board
   3. Start with Sprint-1 tasks!
   4. Modify tasks as needed - they're flexible!

🎉 All set! Happy coding!
```

---

### ☐ Step 5: Verify Everything Was Created (2 minutes)

**Check Issues:**
1. Go to: `https://github.com/YOUR_USERNAME/devmet-app/issues`
2. You should see 3 issues created
3. Each should have multiple labels (priority, type, category, size, sprint)

**Check Labels:**
1. Go to: `https://github.com/YOUR_USERNAME/devmet-app/labels`
2. You should see 24 labels with different colors

**Check Project Board:**
1. Go to: `https://github.com/YOUR_USERNAME` (your profile)
2. Click: **"Projects"** tab
3. You should see: **"DevMetrics Development"**
4. Click on it to open the project board

---

### ☐ Step 6: Organize Your Project Board (5 minutes)

1. **Open your project**: Click on "DevMetrics Development"

2. **Add columns** (if they don't exist):
   - Click **"+ Add column"** or the "+" button
   - Create these columns in order:
     - 📋 Backlog
     - 🏃 Sprint 1
     - 🏃 Sprint 2
     - 🏃 Sprint 3
     - 🏃 Sprint 4
     - ⏳ In Progress
     - 👀 In Review
     - ✅ Done

3. **Add issues to the board**:
   - Click **"+ Add item"** in the Sprint 1 column
   - Search for issues labeled `Sprint-1`
   - Add them all to the Sprint 1 column

4. **Organize**:
   - Drag issues into the right columns
   - Sprint 1 tasks go in the "Sprint 1" column
   - Everything else can go in "Backlog" for now

---

### ☐ Step 7: Customize and Start Working (Optional)

**Make tasks flexible:**
1. Open any issue
2. Add a comment with modifications:
   ```markdown
   ## Modified Approach
   Instead of X, I'll do Y because...
   
   ## Additional Criteria
   - [ ] Extra thing I thought of
   ```

**Set up automations** (optional):
1. Click on project board settings (⚙️)
2. Enable built-in automation:
   - Auto-add new issues to board
   - Auto-move to "Done" when closed
   - Auto-move to "In Progress" when assigned

---

## 🚨 Troubleshooting

### "ModuleNotFoundError: No module named 'requests'"

**Problem**: Python requests library not installed

**Fix**:
```bash
pip3 install requests
# or
python3 -m pip install requests
```

---

### "Authentication failed" or "Bad credentials"

**Problem**: Token is wrong, expired, or not set

**Fix**:
1. Check token is copied correctly (no extra spaces)
2. Generate a new token: https://github.com/settings/tokens
3. Re-export:
   ```bash
   export GITHUB_TOKEN="new_token_here"
   ```

---

### "Repository not found"

**Problem**: Wrong username or repo name

**Fix**:
```bash
# Check what's set
echo $GITHUB_OWNER
echo $GITHUB_REPO

# Fix it
export GITHUB_OWNER="correct_username"  # no @, lowercase
export GITHUB_REPO="devmet-app"         # exact repo name
```

---

### "Project creation failed"

**Problem**: GraphQL API access or permissions

**Fix**: Create project manually
1. Go to: https://github.com/YOUR_USERNAME?tab=projects
2. Click: **"New project"**
3. Choose: **"Board"** view
4. Name it: `DevMetrics Development`
5. Click: **"Create project"**

The issues will still be created even if project fails!

---

### Script runs but nothing appears on GitHub

**Problem**: Maybe pointing to wrong repo

**Fix**: Verify repo connection
```bash
cd /Users/chandradrusya/Desktop/devmet-app
git remote -v

# Should show:
# origin  https://github.com/YOUR_USERNAME/devmet-app.git (fetch)
# origin  https://github.com/YOUR_USERNAME/devmet-app.git (push)
```

---

## 📊 What You'll Have After Setup

- ✅ **24 Labels** for organizing tasks
  - Priority: P0-Critical, P1-High, P2-Medium, P3-Low
  - Type: feature, chore, enhancement, bug
  - Category: backend, frontend, infrastructure, ai, integration, testing, docs
  - Size: XS, S, M, L, XL
  - Sprint: Sprint-1, Sprint-2, Sprint-3, Sprint-4, Backlog

- ✅ **3 GitHub Issues** (Sprint 1 starter tasks)
  - TASK-001: Install PostgreSQL
  - TASK-002: Install Redis
  - TASK-003: Initialize API Project

- ✅ **1 Project Board** ("DevMetrics Development")
  - Visual Kanban board
  - Organized by sprints
  - Easy to track progress

---

## 🎯 Next Steps After Setup

1. **Add more issues** (optional):
   - Edit `scripts/create_github_tasks.py`
   - Add Sprint 2, 3, 4 tasks from `TASK_SPECIFICATION.md`
   - Run script again

2. **Start working**:
   - Pick TASK-001 from your board
   - Assign it to yourself
   - Move it to "In Progress"
   - Start coding!

3. **Track progress**:
   - Check off acceptance criteria as you complete them
   - Add comments with progress updates
   - Move to "Done" when finished

4. **Weekly review**:
   - Review what got done
   - Plan next week
   - Adjust priorities if needed

---

## 💡 Pro Tips

- **Daily habit**: Check your board every morning
- **Small commits**: Commit code often with issue numbers (`git commit -m "feat: add auth #14"`)
- **Update issues**: Add comments when you discover something
- **Flexible approach**: Don't be afraid to modify tasks!
- **Use filters**: Filter by label to see specific categories
- **Milestones**: Group issues into milestones for better tracking
- **Linking**: Reference issues in commits: `Fixes #5` or `Related to #10`

---

## ✅ Checklist Complete!

Mark off each step as you complete it:

- [ ] Step 1: Created GitHub Personal Access Token
- [ ] Step 2: Verified/Created GitHub Repository
- [ ] Step 3: Set environment variables
- [ ] Step 4: Ran setup script successfully
- [ ] Step 5: Verified issues and labels on GitHub
- [ ] Step 6: Organized project board
- [ ] Step 7: Ready to start development!

---

**🎉 Congratulations! Your GitHub task management is set up!**

**First task**: Go to your issues and start with TASK-001!

URL: `https://github.com/YOUR_USERNAME/devmet-app/issues`

---

**Need help?** Check `GITHUB_SETUP_GUIDE.md` for more detailed instructions.

