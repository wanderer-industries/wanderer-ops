defmodule WandererOps.Shared.Constants do
  @moduledoc """
  Centralized constants for WandererOps.
  Consolidates magic numbers, retry policies, timeouts, colors, and other constants
  that are used across multiple modules.
  """

  # ── HTTP & Network Timeouts ─────────────────────────────────────────────────

  @doc "Default HTTP request timeout in milliseconds"
  def default_timeout, do: 15_000

  @doc "Default HTTP receive timeout in milliseconds"
  def default_recv_timeout, do: 15_000

  @doc "Default HTTP connection timeout in milliseconds"
  def default_connect_timeout, do: 5_000

  @doc "Default HTTP pool timeout in milliseconds"
  def default_pool_timeout, do: 5_000

  @doc "ESI service timeout in milliseconds"
  def esi_timeout, do: 30_000

  # ── Retry Policies ──────────────────────────────────────────────────────────

  @doc "Maximum number of retries for HTTP requests"
  def max_retries, do: 3

  @doc "Base backoff delay in milliseconds"
  def base_backoff, do: 1_000

  @doc "Maximum backoff delay in milliseconds"
  def max_backoff, do: 30_000

  # ── Cache & TTL Values ──────────────────────────────────────────────────────
  # Note: Cache TTL values have been moved to WandererOps.Infrastructure.Cache module
  # for better centralization and consistency.

  # ── Scheduler Intervals ─────────────────────────────────────────────────────

  @doc "Default application service interval in milliseconds"
  def default_service_interval, do: 30_000

  @doc "Batch log interval in milliseconds"
  def batch_log_interval, do: 5_000

  @doc "System update scheduler interval in milliseconds"
  def system_update_interval, do: 30_000

  @doc "License validation refresh interval in milliseconds"
  def license_refresh_interval, do: 1_200_000

  @doc "Feature flag check interval in milliseconds"
  def feature_check_interval, do: 30_000

  @doc "Service status report interval in milliseconds"
  def service_status_interval, do: 3_600_000

  @doc "Web server heartbeat check interval in milliseconds"
  def web_server_heartbeat_interval, do: 30_000

  # ── Sleep & Delay Intervals ─────────────────────────────────────────────────

  @doc "Sleep interval for rate limiting in milliseconds"
  def rate_limit_sleep, do: 1_000

  @doc "Startup notification delay in milliseconds"
  def startup_notification_delay, do: 2_000

  @doc "Test sleep interval in milliseconds (for tests)"
  def test_sleep_interval, do: 100

  # ── HTTP Status Codes ───────────────────────────────────────────────────────

  @doc "HTTP success status code"
  def success_status, do: 200

  # ── Notification Limits ─────────────────────────────────────────────────────

  @doc "Maximum rich notifications for limited licenses"
  def max_rich_notifications, do: 5

  # ── Application Settings ────────────────────────────────────────────────────

  @doc "User agent string for HTTP requests"
  def user_agent, do: "WandererOps/1.0"

  @doc "Default port for the application"
  def default_port, do: 4_000

  @doc "Cache key separator"
  def cache_key_separator, do: ":"

  @doc "Minimum parts required for a valid cache key"
  def min_cache_key_parts, do: 2

  # ── Retry Threshold Settings ────────────────────────────────────────────────

  @doc "Timeout threshold for considering connection issues"
  def timeout_threshold, do: 5

  # ── Helper Functions ────────────────────────────────────────────────────────

  @doc """
  Calculates exponential backoff delay based on retry count.
  Uses the formula: base_backoff * 2^(retry_count - 1)
  """
  @spec calculate_backoff(non_neg_integer(), non_neg_integer() | nil) :: non_neg_integer()
  def calculate_backoff(retry_count, base_backoff_value \\ nil) do
    base = base_backoff_value || base_backoff()
    calculated = base * :math.pow(2, retry_count - 1)
    min(trunc(calculated), max_backoff())
  end
end
