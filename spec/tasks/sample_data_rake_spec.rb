require "rails_helper"
require "rake"

RSpec.describe "sample_data rake tasks" do
  before do
    Rake.application = Rake::Application.new
    Rake::Task.define_task(:environment)
    load Rails.root.join("lib/tasks/sample_data.rake")

    task = Rake::Task["sample_data:create_primary_entries"]
    task.reenable
  end

  let(:task) { Rake::Task["sample_data:create_primary_entries"] }

  it "全プレイヤー分の一次エントリーを pending で作成する" do
    create_list(:player, 3)

    expect { task.invoke }.to change(Entry, :count).by(3)

    expect(Entry.all).to all(have_attributes(entry_phase: "primary", status: "pending", priority: nil))
  end

  it "既存のエントリーをクリアして作り直す" do
    player = create(:player)
    create(:entry, player:, entry_phase: :secondary, status: :accepted, priority: 1)

    expect { task.invoke }.not_to change(Entry, :count)

    entry = Entry.find_by(player:)
    expect(entry).to be_present
    expect(entry).to be_primary
    expect(entry).to be_pending
    expect(entry.priority).to be_nil
  end
end
