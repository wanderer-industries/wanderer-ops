defmodule WandererOps.PathExtractor do
  def extract_base_url(url) do
    uri = URI.parse(url)

    port_part =
      if needs_port?(uri.scheme, uri.port) do
        ":#{uri.port}"
      else
        ""
      end

    case {uri.scheme, uri.host} do
      {nil, nil} -> ""
      {nil, host} -> "#{host}#{port_part}"
      {scheme, host} -> "#{scheme}://#{host}#{port_part}"
    end
  end

  def extract_path(url) do
    url
    |> URI.parse()
    |> Map.get(:path, "")
    |> ensure_non_empty_path()
    |> String.trim_leading("/")
    |> String.trim_trailing("/")
  end

  defp needs_port?(scheme, port) do
    default = default_port(scheme)
    port != nil && port != default
  end

  defp default_port("http"), do: 80
  defp default_port("https"), do: 443
  defp default_port(_), do: nil

  defp ensure_non_empty_path(""), do: ""
  defp ensure_non_empty_path(path), do: path
end
