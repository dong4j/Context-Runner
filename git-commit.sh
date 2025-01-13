#!/bin/bash

# 获取当前脚本的所在目录
SCRIPT_DIR=$(dirname "$(realpath "$0")")

cd "$SCRIPT_DIR" || exit 1

# 使用第一个参数作为提交信息，如果未提供参数，则使用默认信息
COMMIT_MESSAGE=${1:-"重构代码,优化代码结构,增加注释"}

# 执行 Git 操作
git add .
git commit -m "$COMMIT_MESSAGE"
git push -u origin main