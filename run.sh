#!/bin/bash

# 获取当前脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 目标脚本文件名
TARGET_SCRIPT="run_rl_swarm.sh"

# 检查目标脚本文件是否存在
if [ ! -f "$SCRIPT_DIR/$TARGET_SCRIPT" ]; then
    echo "错误: 文件 $TARGET_SCRIPT 不存在于当前目录"
    exit 1
fi

# 添加执行权限
echo "正在给 $TARGET_SCRIPT 添加执行权限..."
chmod +x "$SCRIPT_DIR/$TARGET_SCRIPT"

# 检查chmod是否成功
if [ $? -ne 0 ]; then
    echo "错误: 无法添加执行权限"
    exit 1
fi

echo "权限添加成功！"

# 运行目标脚本
echo "正在运行 $TARGET_SCRIPT..."
"$SCRIPT_DIR/$TARGET_SCRIPT"