class AddCharTimestampsToQuestions < ActiveRecord::Migration[8.1]
  def change
    add_column :questions, :char_timestamps, :json
  end
end
