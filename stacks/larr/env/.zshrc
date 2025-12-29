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

# Enable searching through history
bindkey '^R' history-incremental-pattern-search-backward

# Load aliases and shortcuts if exists
[ -f "$HOME/.zsh/aliasrc" ] && source "$HOME/.zsh/aliasrc"

source ~/.zsh/themes/powerlevel10k/powerlevel10k.zsh-theme

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

# NPM completion
source ~/.zsh/plugins/zsh-better-npm-completion/zsh-better-npm-completion.plugin.zsh

# Cargo
source "$HOME/.cargo/env"

# Fasd
eval "$(fasd --init posix-alias zsh-hook)"

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
source ~/.zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

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
export PATH=/usr/local/go/bin:$PATH

# Golang environment variables
export GOROOT=/usr/local/go
export GOPATH=$HOME/go
export PATH=$GOPATH/bin:$GOROOT/bin:$HOME/.local/bin:$PATH:

# Set standard config dir
export XDG_CONFIG_HOME="$HOME/.config"

# DuckDB
export PATH="$HOME/.duckdb/cli/latest:$PATH"

# pnpm
export PNPM_HOME="$HOME/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

# Ollama
OLLAMA_HOST=0.0.0.0

# Turso
[ -f "$HOME/.turso/env" ] && . "$HOME/.turso/env"
export PATH="$HOME/.turso:$PATH"

# Load API keys from dotenvx (encrypted in ~/git/larr-dev-env/.env)
if command -v dotenvx &> /dev/null && [ -f "$HOME/git/larr-dev-env/.env" ]; then
  eval "$(dotenvx get --format shell 2>/dev/null)"
fi

# Cognee LLM settings (API keys loaded from dotenvx above)
export LLM_PROVIDER="gemini"
export LLM_MODEL="gemini/gemini-flash-lite-latest"
export EMBEDDING_PROVIDER="gemini"
export EMBEDDING_MODEL="gemini/gemini-embedding-001"

# User-level pyenv (overrides system pyenv)
export PYENV_ROOT="$HOME/.pyenv"
export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"

# opencode
export PATH=$HOME/.opencode/bin:$PATH

# Local bin
export PATH="$HOME/.local/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/.local/lib:$LD_LIBRARY_PATH"
