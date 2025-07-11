#!/usr/bin/sh

_pkg_api() {
    unfunction _pkg_api 2> /dev/null || unset _pkg_api
    (
        set -e
        cd "$1"
        pnpm pkglinux
    )
}

_pkg_electron() {
    unfunction _pkg_electron 2> /dev/null || unset _pkg_electron
    (
        set -e
        cd "$1"
        pnpm build
        pnpm electron:build --linux --x64
    )
}


(
    set -e
    self=$(realpath "$0")
    here=$(dirname "$self")
    cd "$here"
    _pkg_api "$here/api"
    _pkg_electron "$here"
    echo "Package done."
)
