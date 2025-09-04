defmodule WandererOps.Api.Map do
  @moduledoc false

  use Ash.Resource,
    domain: WandererOps.Api,
    data_layer: AshPostgres.DataLayer

  postgres do
    repo(WandererOps.Repo)
    table("maps_v1")
  end

  attributes do
    uuid_primary_key :id

    attribute :title, :string do
      allow_nil? false
      constraints trim?: false, max_length: 100, min_length: 1, allow_empty?: false
    end

    attribute :color, :string do
      allow_nil? true
    end

    attribute :map_url, :string do
      allow_nil? true
    end

    attribute :main_system_eve_id, :integer do
      allow_nil? true
    end

    attribute :public_api_key, :string do
      allow_nil? true
    end

    attribute :is_main, :boolean do
      allow_nil? true
    end

    create_timestamp(:inserted_at)
    update_timestamp(:updated_at)
  end

  relationships do
  end

  actions do
    default_accept [
      :title,
      :color,
      :map_url,
      :public_api_key
    ]

    defaults [:create, :read, :destroy]

    create :new do
      accept [:title, :color, :map_url, :public_api_key]
      primary?(true)
    end

    update :update do
      primary? true
      require_atomic? false
    end

    update :update_title do
      accept [:title]
      require_atomic? false
    end

    update :update_main_system do
      accept [:main_system_eve_id]
      require_atomic? false
    end

    update :update_is_main do
      accept [:is_main]
      require_atomic? false
    end
  end

  code_interface do
    define(:new, action: :new)
    define(:read, action: :read)
    define(:destroy, action: :destroy)
    define(:update, action: :update)
    define(:update_title, action: :update_title)
    define(:update_main_system, action: :update_main_system)
    define(:update_is_main, action: :update_is_main)

    define(:by_id,
      get_by: [:id],
      action: :read
    )
  end
end
