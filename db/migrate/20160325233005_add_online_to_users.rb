class AddOnlineToUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :users, :online, :boolean, default: true
  end
end
