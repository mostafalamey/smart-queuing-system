# Git Commands to Merge Feature Branch to Main

# Switch to main branch
git checkout main

# Pull latest changes from origin/main to ensure we're up to date
git pull origin main

# Merge the feature branch into main
git merge feature/subscription-plan-system-implementation

# Push the merged changes to main
git push origin main

# Optional: Delete the feature branch locally (after successful merge)
# git branch -d feature/subscription-plan-system-implementation

# Optional: Delete the feature branch on remote (after successful merge)
# git push origin --delete feature/subscription-plan-system-implementation
