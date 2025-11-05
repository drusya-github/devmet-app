# 🎯 Simple GitHub Setup - Do This Now

**Goal**: Get your 69 tasks onto GitHub as issues with a project board  
**Time**: 20 minutes  
**Difficulty**: Easy

---

## ✅ Step-by-Step Instructions

### STEP 1: Install Python Dependency (1 minute)

```bash
pip3 install requests
```

**What this does**: Installs the library needed for the automation script

---

### STEP 2: Create GitHub Personal Access Token (3 minutes)

1. Go to: https://github.com/settings/tokens
2. Click: **"Generate new token (classic)"** button
3. Give it a name: `DevMetrics`
4. Set expiration: `90 days`
5. Check these boxes:
   - ✅ **repo** (this will auto-check all sub-items)
   - ✅ **project** (Full control of projects)
6. Scroll down and click: **"Generate token"** (green button)
7. **COPY THE TOKEN** - it looks like: `ghp_xxxxxxxxxxxxxxxxxxxx`
8. Save it somewhere safe temporarily

**⚠️ IMPORTANT**: You'll only see this token once! Copy it now!

---

### STEP 3: Create/Verify Your GitHub Repository (5 minutes)

#### Option A: If you DON'T have a repo yet

1. Go to: https://github.com/new
2. Repository name: `devmet-app`
3. Description: `DevMetrics - Real-time Development Analytics Platform`
4. Make it **Public** (better for portfolio)
5. **DO NOT** check any boxes (no README, no .gitignore, no license)
6. Click: **"Create repository"**

Then in your terminal:
```bash
cd /Users/chandradrusya/Desktop/devmet-app

# Link to GitHub (replace YOUR_USERNAME with your actual GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/devmet-app.git

# Push your code
git branch -M main
git add .
git commit -m "Initial commit: Project structure and task specifications"
git push -u origin main
```

#### Option B: If you ALREADY have the repo

Just make sure your code is pushed:
```bash
cd /Users/chandradrusya/Desktop/devmet-app
git add .
git commit -m "Add task management system"
git push
```

---

### STEP 4: Set Environment Variables (2 minutes)

Open Terminal and run these commands (replace with YOUR info):

```bash
# Set your GitHub token (paste the token from Step 2)
export GITHUB_TOKEN="ghp_YOUR_TOKEN_HERE"

# Set your GitHub username (just the username, no @)
export GITHUB_OWNER="your_github_username"

# Set your repo name
export GITHUB_REPO="devmet-app"
```

**Example** (replace with your actual values):
```bash
export GITHUB_TOKEN="ghp_abc123xyz789..."
export GITHUB_OWNER="chandradrusya"
export GITHUB_REPO="devmet-app"
```

**Verify they're set**:
```bash
echo "Token (last 4 chars): ...${GITHUB_TOKEN: -4}"
echo "Owner: $GITHUB_OWNER"
echo "Repo: $GITHUB_REPO"
```

---

### STEP 5: Run the Automation Script (2 minutes)

```bash
cd /Users/chandradrusya/Desktop/devmet-app
python3 scripts/create_github_tasks.py
```

**What you'll see**:
```
🚀 DevMetrics GitHub Task Creator
============================================================
📦 Repository: your_username/devmet-app

📌 Creating labels...
✓ Created label: P0-Critical
✓ Created label: P1-High
... (more labels)

📋 Creating Sprint 1 issues (3 tasks)...
✓ Created issue #1: [TASK-001] Install and Configure PostgreSQL
✓ Created issue #2: [TASK-002] Install and Configure Redis
✓ Created issue #3: [TASK-003] Initialize API Project Structure

📊 Creating project board...
✓ Created project board: DevMetrics Development

============================================================
✅ Summary:
   - Labels created: 24
   - Issues created: 3
   - Project board created: DevMetrics Development
🎉 All set! Happy coding!
```

**⚠️ Note**: The script currently creates 3 Sprint 1 tasks. Keep reading to add all 69 tasks!

---

### STEP 6: Verify on GitHub (2 minutes)

Open your browser and check:

**Check Issues**:
```
https://github.com/YOUR_USERNAME/devmet-app/issues
```
You should see 3 issues with colorful labels!

**Check Labels**:
```
https://github.com/YOUR_USERNAME/devmet-app/labels
```
You should see 24 labels organized by color!

**Check Project Board**:
```
https://github.com/YOUR_USERNAME
```
Click the **"Projects"** tab → You should see "DevMetrics Development"

---

### STEP 7: Add ALL 69 Tasks (Manual - Optional) (10 minutes)

The script only creates 3 tasks by default. To add ALL 69 tasks:

#### Option A: Manual Creation (Recommended for Learning)

For each task in `TASK_SPECIFICATION.md`:

1. Go to: `https://github.com/YOUR_USERNAME/devmet-app/issues`
2. Click: **"New issue"**
3. Title: Copy from task (e.g., `[TASK-004] Install Backend Dependencies`)
4. Description: Copy the full task description
5. Labels: Add appropriate labels (priority, type, category, size, sprint)
6. Click: **"Submit new issue"**

**Repeat for all 69 tasks** (or just do them as you need them!)

#### Option B: Edit the Script (For Advanced Users)

1. Open `scripts/create_github_tasks.py`
2. Add more task dictionaries to `SPRINT_1_TASKS` array
3. Run the script again

See `GITHUB_SETUP_GUIDE.md` for details on how to do this.

#### Option C: Use the CSV (For Project Management Tools)

1. Open `tasks-export.csv`
2. Import into Notion, Trello, Jira, etc.
3. These tools can often sync to GitHub

---

### STEP 8: Organize Your Project Board (5 minutes)

1. Go to your project: `https://github.com/YOUR_USERNAME` → Projects → "DevMetrics Development"

2. **Add columns** (if not auto-created):
   - Click **"+ Add column"**
   - Create: `📋 Backlog`, `Sprint 1`, `Sprint 2`, `Sprint 3`, `Sprint 4`, `In Progress`, `In Review`, `Done`

3. **Add issues to board**:
   - Click **"+ Add item"** in any column
   - Search for issues
   - Add them to appropriate sprint columns

4. **Organize**:
   - Drag Sprint 1 issues to "Sprint 1" column
   - Put future tasks in "Backlog"
   - Set up any automation you want

---

## 🎉 You're Done!

You should now have:
- ✅ Issues on GitHub
- ✅ Labels organized
- ✅ Project board set up
- ✅ Ready to start coding!

---

## 🚀 What to Do Next

### Start Working:
1. Go to your project board
2. Pick TASK-001 (Install PostgreSQL)
3. Assign it to yourself
4. Move it to "In Progress"
5. Start working!

### As You Work:
1. Check off acceptance criteria in the issue
2. Commit code with references: `git commit -m "feat: add postgres setup #1"`
3. Update the issue with comments
4. Close when done (moves to "Done" column)

---

## 🔧 Manual vs Automated Breakdown

### ✅ AUTOMATED (Script Does This):
- Creates all 24 labels
- Creates Sprint 1 issues (3 tasks)
- Creates project board
- Links everything together

### 👤 MANUAL (You Do This):
- Get GitHub token
- Push code to GitHub
- Set environment variables
- Run the script
- Add remaining 66 tasks (optional)
- Organize project board columns
- Work on tasks

---

## 🚨 Common Issues & Fixes

### "ModuleNotFoundError: No module named 'requests'"
```bash
pip3 install requests
```

### "Authentication failed"
- Token is wrong or expired
- Generate new token: https://github.com/settings/tokens
- Make sure it has `repo` and `project` scopes
- Re-export: `export GITHUB_TOKEN="new_token"`

### "Repository not found"
- Check username is correct (no @, lowercase)
- Check repo exists on GitHub
- Verify: `echo $GITHUB_OWNER`

### Script runs but nothing on GitHub
- Check you're looking at the right repo
- Verify environment variables: `echo $GITHUB_TOKEN`
- Check the script output for errors

### "Project creation failed"
- Create project manually:
  1. Go to your GitHub profile → Projects
  2. Click "New project"
  3. Choose "Board" view
  4. Name it "DevMetrics Development"
- Issues will still be created!

---

## 💡 Pro Tips

### Tip 1: Start Small
Just create Sprint 1 tasks first. Add more as you need them.

### Tip 2: Use Issue Templates
Create `.github/ISSUE_TEMPLATE.md` for consistent issues.

### Tip 3: Link Commits to Issues
```bash
git commit -m "feat: implement auth #14"
git commit -m "fix: resolve bug in metrics #23"
git commit -m "Closes #5"  # Auto-closes issue when merged
```

### Tip 4: Use Labels for Filtering
Click labels to filter: "Show me all P0-Critical tasks"

### Tip 5: Set Up Automation
In project settings, enable:
- Auto-add new issues to project
- Auto-move to "Done" when closed
- Auto-move to "In Progress" when assigned

---

## 📊 What You'll Have

After completing all steps:

```
GitHub Repository: devmet-app
├── 📋 Issues (3-69 depending on what you create)
│   ├── #1 [TASK-001] Install PostgreSQL
│   ├── #2 [TASK-002] Install Redis
│   ├── #3 [TASK-003] Initialize API
│   └── ... (more as you add them)
│
├── 🏷️ Labels (24 total)
│   ├── Priority: P0, P1, P2, P3
│   ├── Type: feature, chore, enhancement
│   ├── Category: backend, frontend, ai, etc.
│   ├── Size: XS, S, M, L, XL
│   └── Sprint: Sprint-1, Sprint-2, etc.
│
└── 📊 Project Board: "DevMetrics Development"
    ├── Backlog
    ├── Sprint 1-4 columns
    ├── In Progress
    ├── In Review
    └── Done
```

---

## ✅ Final Checklist

Go through this list:

- [ ] Installed `requests` library
- [ ] Created GitHub Personal Access Token
- [ ] Saved token somewhere safe
- [ ] Repository exists on GitHub
- [ ] Code pushed to GitHub
- [ ] Set `GITHUB_TOKEN` environment variable
- [ ] Set `GITHUB_OWNER` environment variable  
- [ ] Set `GITHUB_REPO` environment variable
- [ ] Ran `python3 scripts/create_github_tasks.py`
- [ ] Saw success messages in terminal
- [ ] Verified issues on GitHub
- [ ] Verified labels on GitHub
- [ ] Verified project board exists
- [ ] Organized project board columns
- [ ] Added remaining tasks (optional)
- [ ] Ready to start TASK-001!

---

## 🎯 Quick Command Reference

```bash
# Install dependencies
pip3 install requests

# Set environment variables (REPLACE WITH YOUR INFO!)
export GITHUB_TOKEN="ghp_your_token_here"
export GITHUB_OWNER="your_username"
export GITHUB_REPO="devmet-app"

# Run the automation
cd /Users/chandradrusya/Desktop/devmet-app
python3 scripts/create_github_tasks.py

# Verify
echo "Check: https://github.com/$GITHUB_OWNER/$GITHUB_REPO/issues"
```

---

## 🚀 Start Coding!

Once everything is set up:

1. **View your board**: `https://github.com/YOUR_USERNAME/devmet-app/projects/1`
2. **Pick TASK-001**: Install PostgreSQL
3. **Assign to yourself**: Click on issue → Assignees → Select yourself
4. **Move to "In Progress"**: Drag the card or change status
5. **Start working**: Follow the acceptance criteria
6. **Commit your work**: Reference the issue number
7. **Close when done**: Issue moves to "Done"

---

**You've got this!** 💪 

**Questions?** Check `GITHUB_SETUP_GUIDE.md` for more details.

---

**Now go create those issues and start building!** 🚀✨

