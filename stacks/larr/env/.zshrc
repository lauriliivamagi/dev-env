# If not running interactively, don't do anything
[[ $- != *i* ]] && return

# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

setopt histignorealldups sharehistory

export EDITOR=nvim
export GIT_EDITOR=nvim

# Keep 100000 lines of history within the shell and save it to ~/.zsh_history:
HISTSIZE=100000
SAVEHIST=100000
HISTFILE=~/.zsh_history

# Use modern completion system
fpath=(~/.zsh $fpath)
autoload -Uz compinit
zstyle ':completion:*' menu select

# Auto complete with case insenstivity
zstyle ':completion:*' matcher-list '' 'm:{a-zA-Z}={A-Za-z}' 'r:|[._-]=* r:|=*' 'l:|=* r:|=*'
compinit -u
_comp_options+=(globdots) # include hidden files

# Enable searching through history (fallback when fzf is absent)
bindkey '^R' history-incremental-pattern-search-backward

# fzf shell integration (Ctrl-R history, Ctrl-T files, Alt-C directories).
# apt's fzf ships these under /usr/share/doc; it never creates ~/.fzf.zsh.
[ -f /usr/share/doc/fzf/examples/key-bindings.zsh ] && source /usr/share/doc/fzf/examples/key-bindings.zsh
[ -f /usr/share/doc/fzf/examples/completion.zsh ] && source /usr/share/doc/fzf/examples/completion.zsh

# Load aliases and shortcuts if exists
[ -f "$HOME/.zsh/aliasrc" ] && source "$HOME/.zsh/aliasrc"

[ -f ~/.zsh/themes/powerlevel10k/powerlevel10k.zsh-theme ] && source ~/.zsh/themes/powerlevel10k/powerlevel10k.zsh-theme

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

# NPM completion
[ -f ~/.zsh/plugins/zsh-better-npm-completion/zsh-better-npm-completion.plugin.zsh ] && source ~/.zsh/plugins/zsh-better-npm-completion/zsh-better-npm-completion.plugin.zsh

# Cargo (unconditional PATH for testing, source env if exists for extras)
export PATH="$HOME/.cargo/bin:$PATH"
[ -f "$HOME/.cargo/env" ] && source "$HOME/.cargo/env"

# Use lf to switch directories and bind it to ctrl-o
lfcd () {
    tmp="$(mktemp)"
    lf -last-dir-path="$tmp" "$@"
    if [ -f "$tmp" ]; then
        dir="$(cat "$tmp")"
        rm -f "$tmp"
        [ -d "$dir" ] && [ "$dir" != "$(pwd)" ] && cd "$dir"
    fi
}
bindkey -s '^o' 'lfcd\n'

# Load plugins
[ -f ~/.zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh ] && source ~/.zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

# deno
export DENO_INSTALL="$HOME/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"

# Volta.sh
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"

alias pbpaste='xclip -o -selection clipboard'

# CUDA Toolkit
export PATH=/usr/local/cuda/bin:$PATH
export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH

# Go
export GOROOT=/usr/local/go
export GOPATH=$HOME/go
export PATH="$GOPATH/bin:$GOROOT/bin:$PATH"

# Set standard config dir
export XDG_CONFIG_HOME="$HOME/.config"

# pnpm
export PNPM_HOME="$HOME/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

# Load API keys from dotenvx (encrypted in ~/git/larr-dev-env/.env)
if command -v dotenvx &> /dev/null && [ -f "$HOME/git/larr-dev-env/.env" ]; then
  eval "$(dotenvx get -f "$HOME/git/larr-dev-env/.env" --format shell 2>/dev/null)"
fi

# Cognee LLM settings (API keys loaded from dotenvx above)
export LLM_PROVIDER="gemini"
export LLM_MODEL="gemini/gemini-flash-lite-latest"
export EMBEDDING_PROVIDER="gemini"
export EMBEDDING_MODEL="gemini/gemini-embedding-001"

# User-level pyenv (overrides system pyenv)
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
command -v pyenv &>/dev/null && eval "$(pyenv init -)"

# opencode
export PATH=$HOME/.opencode/bin:$PATH

# Edge.js
export EDGEJS_HOME="$HOME/.edgejs"
export PATH="$EDGEJS_HOME/bin:$PATH"

# Wasmer
export WASMER_DIR="$HOME/.wasmer"
[ -s "$WASMER_DIR/wasmer.sh" ] && source "$WASMER_DIR/wasmer.sh"

# Resend CLI
export PATH="$HOME/.resend/bin:$PATH"

# Local bin and scripts
export PATH="$HOME/.local/bin:$HOME/.local/scripts:$PATH"
export LD_LIBRARY_PATH="$HOME/.local/lib:$LD_LIBRARY_PATH"

# zoxide (smarter cd: `z dir`, `zi` for interactive). After ~/.local/bin is on PATH.
command -v zoxide &>/dev/null && eval "$(zoxide init zsh)"

# SDKMAN (Java/Maven/Gradle). Installed by the sdkman task with rcupdate=false,
# so this is the only place the hook lives. SDKMAN wants it last in the file.
export SDKMAN_DIR="$HOME/.sdkman"
[[ -s "$SDKMAN_DIR/bin/sdkman-init.sh" ]] && source "$SDKMAN_DIR/bin/sdkman-init.sh"

# open book page <path|filename|entry-id> [page]   → open the Library PDF at that page
# `page` is the PDF page index (= what docling cites), not the printed folio.
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
