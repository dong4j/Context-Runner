#!/bin/bash

# 将图片转换为 webp
webp() {
  ffmpeg -i "$1" -c:v libwebp -q:v 65 "$2"
  echo "convert" "$1" 'to' "$2"
}

# 转换并上传
webpp() {
  # 输入参数 $1
  local input="$1"

  # 自动生成输出文件路径，替换扩展名为 .webp
  local output="${input%.*}.webp"

  # 调用 webp 函数进行转换
  webp "$input" "$output"

  # 使用 picgo 上传生成的 .webp 文件
  local upload_output=$(picgo upload "$output")
  echo "upload" "$output"

  # 提取上传返回的 URL
  local url=$(echo "$upload_output" | sed -n 's/.*\(https:\/\/.*\)/\1/p')

  # 如果 URL 不为空，复制到剪贴板
  if [[ -n $url ]]; then
    echo "$url" | pbcopy
    echo "URL has been copied to clipboard"
  else
    echo "Error: No URL found in the upload output"
  fi
}

# 检查是否传入参数
if [[ $# -eq 1 ]]; then
  webpp "$1"
else
  echo "Usage: $0 /path/to/image.png"
fi