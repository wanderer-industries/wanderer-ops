defmodule WandererOps.Map.ApiClient do
  @moduledoc false

  require Logger

  @api_retry_count 1
  @retry_opts [max_retries: 1, retry_log_level: :warning]

  def get_map_systems(map_url, map_public_api_key) do
    url = "#{get_map_base_url(map_url)}/systems"

    auth_opts =
      [access_token: map_public_api_key] |> get_auth_opts()

    get(url, auth_opts)
  end

  defp get_auth_opts(opts), do: [auth: {:bearer, opts[:access_token]}]

  defp get_map_base_url(map_url) do
    base_url = map_url |> WandererOps.PathExtractor.extract_base_url()
    map_slug = map_url |> WandererOps.PathExtractor.extract_path()
    "#{base_url}/api/maps/#{map_slug}"
  end

  defp with_user_agent_opts(opts) do
    opts
    |> Keyword.merge(headers: [{:user_agent, "WandererOps/0.1.0"}])
  end

  defp get(url, api_opts \\ [], opts \\ []) do
    try do
      case Req.get(
             "#{url}",
             api_opts |> with_user_agent_opts() |> Keyword.merge(@retry_opts)
           ) do
        {:ok, %{status: 200, body: body}} ->
          {:ok, body}

        {:ok, %{status: 504}} ->
          {:error, :timeout}

        {:ok, %{status: 404}} ->
          {:error, :not_found}

        {:ok, %{status: status}} ->
          {:error, "Unexpected status: #{status}"}

        {:error, _reason} ->
          {:error, "Request failed"}
      end
    rescue
      e ->
        Logger.error(Exception.message(e))

        {:error, "Request failed"}
    end
  end

  defp post(url, opts) do
    try do
      case Req.post("#{url}", opts) do
        {:ok, %{status: status, body: body}} when status in [200, 201] ->
          {:ok, body}

        {:ok, %{status: 504}} ->
          {:error, :timeout}

        {:ok, %{status: status}} ->
          {:error, "Unexpected status: #{status}"}

        {:error, reason} ->
          {:error, reason}
      end
    rescue
      e ->
        Logger.error(Exception.message(e))

        {:error, "Request failed"}
    end
  end
end
