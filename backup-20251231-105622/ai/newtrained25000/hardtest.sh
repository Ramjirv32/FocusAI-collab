#!/bin/bash
API="http://localhost:8000/predict"

echo "===== HARD / ADVERSARIAL CURL TESTS ====="
echo

#############################################
# 1️⃣ GITHUB (TRICKY CASES)
#############################################
github_urls=(
  "https://github.com/microsoft/vscode/issues/204839"
  "https://github.com/microsoft/vscode/discussions/125432"
  "https://github.com/microsoft/vscode/releases/tag/1.86.0"
  "https://github.com/trending/python?since=daily"
  "https://github.com/sponsors"
  "https://github.com/features/copilot"
  "https://github.com/explore"
)

for url in "${github_urls[@]}"; do
  curl -s "$API?app=Browser&tab=$url&duration=700"
  echo
done

#############################################
# 2️⃣ YOUTUBE (HARD MODE)
#############################################
youtube_urls=(
  "https://www.youtube.com/watch?v=abc123&pp=ygUTcHl0aG9uIHR1dG9yaWFs"
  "https://www.youtube.com/watch?v=abc123&list=PLxyz&index=5"
  "https://www.youtube.com/watch?v=abc123&t=532s"
  "https://www.youtube.com/watch?v=abc123&feature=youtu.be"
  "https://www.youtube.com/watch?v=podcast_ai_future"
  "https://www.youtube.com/watch?v=devlog_game_engine"
  "https://www.youtube.com/shorts/educational_fact"
  "https://www.youtube.com/watch?v=conference_keynote"
  "https://www.youtube.com/watch?v=sponsored_ad"
)

for url in "${youtube_urls[@]}"; do
  curl -s "$API?app=Browser&tab=$url&duration=900"
  echo
done

#############################################
# 3️⃣ DOCS VS MARKETING (VERY HARD)
#############################################
docs_vs_marketing=(
  "https://aws.amazon.com/ec2/pricing/"
  "https://aws.amazon.com/blogs/architecture/"
  "https://cloud.google.com/blog/products/ai"
  "https://cloud.google.com/solutions"
  "https://developer.mozilla.org/en-US/blog/"
  "https://developer.mozilla.org/en-US/docs/Web/API"
  "https://docs.docker.com/get-started/"
  "https://www.docker.com/blog/"
  "https://kubernetes.io/blog/2024/02/20/release/"
)

for url in "${docs_vs_marketing[@]}"; do
  curl -s "$API?app=Browser&tab=$url&duration=800"
  echo
done

#############################################
# 4️⃣ AI TOOLS (NOT OBVIOUS)
#############################################
ai_urls=(
  "https://chat.openai.com/c/analysis"
  "https://openai.com/blog"
  "https://openai.com/research"
  "https://claude.ai/chats"
  "https://claude.ai/why-claude"
  "https://huggingface.co/spaces"
  "https://huggingface.co/blog"
  "https://ollama.ai/library"
  "https://ollama.ai/blog"
)

for url in "${ai_urls[@]}"; do
  curl -s "$API?app=Browser&tab=$url&duration=1000"
  echo
done

#############################################
# 5️⃣ REDDIT (TECH VS TIME-WASTE)
#############################################
reddit_urls=(
  "https://www.reddit.com/r/programming/comments/xyz/new_rust_release/"
  "https://www.reddit.com/r/devops/comments/abc/kubernetes_costs/"
  "https://www.reddit.com/r/MachineLearning/comments/paper_discussion/"
  "https://www.reddit.com/r/AskReddit/comments/funny_question/"
  "https://www.reddit.com/r/memes/comments/top_post/"
  "https://www.reddit.com/r/technology/comments/news_article/"
)

for url in "${reddit_urls[@]}"; do
  curl -s "$API?app=Browser&tab=$url&duration=600"
  echo
done

#############################################
# 6️⃣ WIKIPEDIA (DEPTH TEST)
#############################################
wiki_urls=(
  "https://en.wikipedia.org/wiki/Backpropagation"
  "https://en.wikipedia.org/wiki/Transformer_(machine_learning)"
  "https://en.wikipedia.org/wiki/List_of_programming_languages"
  "https://en.wikipedia.org/wiki/List_of_rock_bands"
  "https://en.wikipedia.org/wiki/Timeline_of_video_games"
)

for url in "${wiki_urls[@]}"; do
  curl -s "$API?app=Browser&tab=$url&duration=500"
  echo
done

#############################################
# 7️⃣ GOOGLE SERVICES (AMBIGUOUS)
#############################################
google_urls=(
  "https://drive.google.com/drive/my-drive"
  "https://docs.google.com/document/d/xyz/edit"
  "https://docs.google.com/spreadsheets/d/xyz/edit"
  "https://news.google.com/topstories"
  "https://calendar.google.com/calendar/u/0/r"
  "https://mail.google.com/mail/u/0/#inbox"
  "https://meet.google.com/abc-defg-hij"
)

for url in "${google_urls[@]}"; do
  curl -s "$API?app=Browser&tab=$url&duration=900"
  echo
done

#############################################
# 8️⃣ DARK PATTERNS / EDGE
#############################################
edge_urls=(
  "https://medium.com/tag/programming"
  "https://medium.com/towards-data-science/why-transformers-work"
  "https://medium.com/@influencer/my-daily-routine"
  "https://dev.to/discuss"
  "https://dev.to/top/week"
  "https://news.ycombinator.com/item?id=123456"
  "https://news.ycombinator.com/jobs"
)

for url in "${edge_urls[@]}"; do
  curl -s "$API?app=Browser&tab=$url&duration=700"
  echo
done

echo
echo "===== HARD TESTING COMPLETE ====="
