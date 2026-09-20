# open book page <path|filename|entry-id> [page]   → open the Library PDF at that page
# `page` is the PDF page index (= what docling cites), not the printed folio.
# Lives here, not in .zshrc: non-interactive zsh reads only .zshenv, so this is
# what makes it available to Claude Code's `!` commands and tool shells.
open_book_page() {
  local f="$1" page="${2:-1}"

  if [ ! -f "$f" ]; then
    local cand="$HOME/pCloudDrive/Dropbox/Raamatud/${f%.pdf}.pdf"
    if [ -f "$cand" ]; then
      f="$cand"
    else
      # treat the argument as a Catalog Entry id; take a PDF File, never the
      # `preferred` one — preference is often the EPUB, which has no pages
      local rel
      rel=$(jq -r --arg id "$f" '
        .works[] | select(.id == $id) | .files[]
        | select(.format == "pdf") | .path' \
        "$HOME/git/books/catalog/index.json" 2>/dev/null | head -1)
      if [ -z "$rel" ]; then
        echo "open_book_page: '$1' is neither a file nor an Entry id with a PDF source" >&2
        echo "  (EPUB-only Works have no pages — cite by section title, not page)" >&2
        return 1
      fi
      f="$HOME/pCloudDrive/Dropbox/Raamatud/$rel"
    fi
  fi

  [ -f "$f" ] || { echo "open_book_page: $f not found" >&2; return 1; }

  xdg-open "file://${f}#page=${page}"
}
