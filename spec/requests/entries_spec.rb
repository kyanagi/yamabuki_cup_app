require "rails_helper"

RSpec.describe "GET /entries", type: :request do
  def create_entry_with_profile(name:, **entry_attrs)
    entry = create(:entry, **entry_attrs)
    create(:player_profile, player: entry.player, entry_list_name: name)
    entry
  end

  it "未ログインでもアクセスできる" do
    get entries_path

    expect(response).to have_http_status(:ok)
  end

  it "優先順位とエントリーリスト名を表示し、priority順 + nilはid順で表示する" do
    entry_priority3 = create_entry_with_profile(name: "優先3", status: :waitlisted, priority: 3)
    entry_pending_a = create_entry_with_profile(name: "抽選待ちA", status: :pending, priority: nil)
    entry_priority1 = create_entry_with_profile(name: "優先1", status: :accepted, priority: 1)
    entry_pending_b = create_entry_with_profile(name: "抽選待ちB", status: :pending, priority: nil)
    create_entry_with_profile(name: "キャンセル", status: :cancelled, priority: 2)

    get entries_path

    expect(response).to have_http_status(:ok)

    doc = response.parsed_body
    expect(doc.css("table thead th").map { |th| th.text.strip }).to eq(["No.", "優先順位", "エントリーリストの名前"])

    rows = doc.css("table tbody tr")
    expect(rows.map { |row| row.css("td").map { |td| td.text.strip } }).to eq([
      [entry_priority1.id.to_s, "1", "優先1"],
      [entry_priority3.id.to_s, "3", "優先3"],
      [entry_pending_a.id.to_s, "抽選待ち", "抽選待ちA"],
      [entry_pending_b.id.to_s, "抽選待ち", "抽選待ちB"],
    ])
    expect(response.body).not_to include("キャンセル")
  end

  it "表示対象のエントリーがない場合は空状態メッセージを表示する" do
    create_entry_with_profile(name: "キャンセルのみ", status: :cancelled, priority: nil)

    get entries_path

    expect(response.body).to include("現在、表示できるエントリーはありません。")
  end
end
