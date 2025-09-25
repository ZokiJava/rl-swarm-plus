#!/usr/bin/env bash

# 监控脚本，用于在程序崩溃或关闭时自动重新运行

set -euo pipefail

# 默认配置
APP_NAME="rl_swarm"
APP_COMMAND="./run_rl_swarm.sh"
LOG_FILE="$PWD/monitor_log.txt"
RESTART_DELAY=5  # 重启前的延迟（秒）
MAX_RESTART_ATTEMPTS=5  # 5分钟内最大重启次数
RESTART_WINDOW=300  # 统计重启次数的时间窗口（秒）

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --app-name)
            APP_NAME="$2"
            shift 2
            ;;
        --command)
            APP_COMMAND="$2"
            shift 2
            ;;
        --log-file)
            LOG_FILE="$2"
            shift 2
            ;;
        --restart-delay)
            RESTART_DELAY="$2"
            shift 2
            ;;
        --help|-h)
            echo "用法: $0 [选项]"
            echo "选项:" 
            echo "  --app-name <名称>    设置应用程序名称（默认: rl_swarm）"
            echo "  --command <命令>     设置要运行的命令（默认: ./run_rl_swarm.sh）"
            echo "  --log-file <文件>    设置日志文件路径（默认: ./monitor_log.txt）"
            echo "  --restart-delay <秒> 设置重启前的延迟（默认: 5秒）"
            echo "  -h, --help           显示帮助信息"
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            echo "使用 -h 或 --help 查看帮助信息"
            exit 1
            ;;
    esac
done

# 确保日志目录存在
mkdir -p "$(dirname "$LOG_FILE")"

# 记录日志函数
log() {
    local timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
    echo "[$timestamp] $1" >> "$LOG_FILE"
    echo "[$timestamp] $1"
}

# 初始化重启计数器文件
RESTART_COUNT_FILE="/tmp/${APP_NAME}_restart_count.txt"
> "$RESTART_COUNT_FILE"

# 主监控循环
monitor_loop() {
    while true; do
        # 检查重启频率是否过高
        current_time=$(date +%s)
        # 清理旧的重启记录
        sed -i "/^[0-9]\+$/!d" "$RESTART_COUNT_FILE"  # 只保留数字行
        while read -r timestamp; do
            if (( current_time - timestamp > RESTART_WINDOW )); then
                sed -i "/^$timestamp$/d" "$RESTART_COUNT_FILE"
            fi
        done < "$RESTART_COUNT_FILE"
        
        # 计算最近重启次数
        restart_count=$(wc -l < "$RESTART_COUNT_FILE")
        if (( restart_count >= MAX_RESTART_ATTEMPTS )); then
            log "错误: 在过去 $RESTART_WINDOW 秒内已重启 $restart_count 次，超过最大限制。停止监控以防止无限重启。"
            exit 1
        fi

        # 启动应用程序
        log "启动应用程序 '$APP_NAME': $APP_COMMAND"
        $APP_COMMAND
        
        # 如果应用程序退出，记录并重启
        exit_code=$?
        log "应用程序 '$APP_NAME' 已退出（退出码: $exit_code）"
        
        # 记录重启时间
        echo "$current_time" >> "$RESTART_COUNT_FILE"
        
        log "将在 $RESTART_DELAY 秒后重新启动应用程序..."
        sleep "$RESTART_DELAY"
    done
}

# 清理函数（当监控脚本退出时执行）
cleanup() {
    log "监控脚本被终止，清理中..."
    rm -f "$RESTART_COUNT_FILE" 2> /dev/null
    exit 0
}

# 设置退出信号处理
 trap cleanup SIGINT SIGTERM

# 启动监控
log "启动监控脚本，监控应用程序 '$APP_NAME'"
log "监控日志将保存在: $LOG_FILE"
log "使用 Ctrl+C 终止监控脚本"

# 在后台运行监控循环
monitor_loop