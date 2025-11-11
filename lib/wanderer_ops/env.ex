defmodule WandererOps.Env do
  @moduledoc false

  @app :wanderer_ops

  def vsn(), do: Application.spec(@app)[:vsn]

  def base_url(), do: get_key(:web_app_url, "<BASE_URL>")
  def admin_username(), do: get_key(:admin_username)
  def admin_password(), do: get_key(:admin_password)

  defp get_key(key, default \\ nil), do: Application.get_env(@app, key, default)
end
