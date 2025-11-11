defmodule WandererOps.Shared.Config do
  @moduledoc """
  Application configuration interface using environment variables and application config.

  Provides a clean, direct interface for configuration without the overhead
  of complex validation, schemas, or configuration managers.
  """

  alias WandererOps.Shared.Env

  # ──────────────────────────────────────────────────────────────────────────────
  # Feature Flags
  # ──────────────────────────────────────────────────────────────────────────────

  @doc "Check if notifications are enabled globally"
  def notifications_enabled?, do: get_boolean("NOTIFICATIONS_ENABLED", true)

  @doc "Check if status messages are enabled"
  def enable_status_messages?, do: get_boolean("ENABLE_STATUS_MESSAGES", false)

  # ──────────────────────────────────────────────────────────────────────────────
  # SSE Configuration
  # ──────────────────────────────────────────────────────────────────────────────

  @doc "Get SSE receive timeout in milliseconds (default: :infinity)"
  def sse_recv_timeout do
    case get_env_private("SSE_RECV_TIMEOUT") do
      nil -> :infinity
      "infinity" -> :infinity
      value when is_binary(value) -> String.to_integer(value)
    end
  end

  @doc "Get SSE connection timeout in milliseconds (default: 30000)"
  def sse_connect_timeout, do: get_integer("SSE_CONNECT_TIMEOUT", 30_000)

  @doc "Get SSE keepalive interval in seconds (default: 30)"
  def sse_keepalive_interval, do: get_integer("SSE_KEEPALIVE_INTERVAL", 30)

  # ──────────────────────────────────────────────────────────────────────────────
  # License Configuration
  # ──────────────────────────────────────────────────────────────────────────────

  @doc "Get license key (required)"
  def license_key, do: get_required_env("LICENSE_KEY")

  @doc "Get license validation URL"
  def license_validation_url,
    do: get_env_private("LICENSE_VALIDATION_URL", "https://lm.wanderer.ltd/validate_bot")

  @doc "Get license manager API key (required)"
  def license_manager_api_key, do: get_required_env("LICENSE_MANAGER_API_KEY")

  @doc "Get license manager API URL"
  def license_manager_api_url,
    do:
      Application.get_env(
        :wanderer_ops,
        :license_manager_api_url,
        "https://lm.wanderer.ltd/api"
      )

  @doc "Get API token (required)"
  def license_manager_api_token,
    do: Application.get_env(:wanderer_ops, :license_manager_api_token)

  # ──────────────────────────────────────────────────────────────────────────────
  # Application Settings
  # ──────────────────────────────────────────────────────────────────────────────

  @doc "Get application environment"
  def environment, do: Application.get_env(:wanderer_ops, :env, :prod)

  @doc "Check if running in production"
  def production?, do: environment() == :prod

  @doc "Check if running in test"
  def test?, do: environment() == :test

  @doc "Get application version"
  def version, do: Application.spec(:wanderer_ops, :vsn) |> to_string()

  # ──────────────────────────────────────────────────────────────────────────────
  # Notification Settings
  # ──────────────────────────────────────────────────────────────────────────────

  @doc "Get startup suppression duration in seconds"
  def startup_suppression_seconds, do: get_integer("STARTUP_SUPPRESSION_SECONDS", 30)

  # ──────────────────────────────────────────────────────────────────────────────
  # Additional Configuration Methods
  # ──────────────────────────────────────────────────────────────────────────────

  @doc "Get telemetry logging enabled flag"
  def telemetry_logging_enabled?, do: get_boolean("TELEMETRY_LOGGING_ENABLED", false)

  @doc "Get schedulers enabled flag"
  def schedulers_enabled?, do: get_boolean("SCHEDULERS_ENABLED", true)

  @doc "Get host configuration"
  def host, do: get_env_private("HOST", "0.0.0.0")

  @doc "Get port configuration"
  def port, do: get_integer("PORT", 4000)

  @doc "Get license refresh interval in milliseconds"
  def license_refresh_interval, do: get_integer("LICENSE_REFRESH_INTERVAL", 3_600_000)

  @doc "Check if feature is enabled"
  def feature_enabled?(feature) when is_atom(feature) do
    feature_key = feature |> Atom.to_string() |> String.upcase()
    get_boolean(feature_key, false)
  end

  @doc "Get features map"
  def features do
    %{
      system_tracking: feature_enabled?(:system_tracking_enabled)
    }
  end

  # ──────────────────────────────────────────────────────────────────────────────
  # Safe Retrieval Functions (return tuples instead of raising)
  # ──────────────────────────────────────────────────────────────────────────────

  @doc """
  Safely get license key, returning {:ok, value} or {:error, :not_found}
  """
  def license_key_safe do
    try do
      {:ok, license_key()}
    rescue
      _ -> {:error, :not_found}
    end
  end

  # ──────────────────────────────────────────────────────────────────────────────
  # Helper Functions (private implementations)
  # ──────────────────────────────────────────────────────────────────────────────

  defp get_env_private(key, default \\ nil), do: Env.get(key, default)
  defp get_required_env(key), do: Env.get_required(key)
  defp get_boolean(key, default), do: Env.get_boolean(key, default)
  defp get_integer(key, default), do: Env.get_integer(key, default)
end
