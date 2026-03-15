require "rails_helper"

RSpec.describe "GET /entries", type: :request do
  def create_entry_with_profile(name:, **entry_attrs)
    entry = create(:entry, **entry_attrs)
    create(:player_profile, player: entry.player, entry_list_name: name)
    entry
  end

  def table_rows_by_header(table)
    headers = table.css("thead th").map { |th| th.text.strip }

    table.css("tbody tr").map do |row|
      headers.zip(row.css("td").map { |td| td.text.strip }).to_h
    end
  end

  it "未ログインでもアクセスできる" do
    get entries_path

    expect(response).to have_http_status(:ok)
  end

  it "通常一覧とキャンセル待ち一覧を分けて表示する" do
    waitlisted_priority3 = create_entry_with_profile(name: "優先3", status: :waitlisted, priority: 3)
    entry_pending_a = create_entry_with_profile(name: "抽選待ちA", status: :pending, priority: nil)
    entry_priority1 = create_entry_with_profile(name: "優先1", status: :accepted, priority: 1)
    entry_pending_b = create_entry_with_profile(name: "抽選待ちB", status: :pending, priority: nil)
    waitlisted_priority2 = create_entry_with_profile(name: "優先2", status: :waitlisted, priority: 2)
    create_entry_with_profile(name: "キャンセル", status: :cancelled, priority: 99)

    get entries_path

    expect(response).to have_http_status(:ok)

    doc = response.parsed_body
    tables = doc.css("table")
    expect(tables.size).to eq(2)

    public_entry_table = tables[0]
    expect(public_entry_table.css("thead th").map { |th| th.text.strip }).to match_array(["ステータス", "No.", "エントリーリストの名前"])
    expect(table_rows_by_header(public_entry_table)).to match_array([
      { "ステータス" => "参加確定", "No." => entry_priority1.id.to_s, "エントリーリストの名前" => "優先1" },
      { "ステータス" => "抽選待ち", "No." => entry_pending_a.id.to_s, "エントリーリストの名前" => "抽選待ちA" },
      { "ステータス" => "抽選待ち", "No." => entry_pending_b.id.to_s, "エントリーリストの名前" => "抽選待ちB" },
    ])

    waitlisted_table = tables[1]
    expect(waitlisted_table.css("thead th").map { |th| th.text.strip }).to match_array(["キャンセル待ち順位", "No.", "エントリーリストの名前"])
    expect(table_rows_by_header(waitlisted_table)).to match_array([
      { "キャンセル待ち順位" => "1", "No." => waitlisted_priority2.id.to_s, "エントリーリストの名前" => "優先2" },
      { "キャンセル待ち順位" => "2", "No." => waitlisted_priority3.id.to_s, "エントリーリストの名前" => "優先3" },
    ])
    expect(doc.css("tbody tr").map(&:text).join("\n")).not_to include("キャンセル")
  end

  it "表示対象のエントリーがない場合は空状態メッセージを表示する" do
    create_entry_with_profile(name: "キャンセルのみ", status: :cancelled, priority: nil)

    get entries_path

    expect(response.body).to include("現在、表示できるエントリーはありません。")
  end

  it "キャンセル待ちがいない場合はキャンセル待ちテーブルを表示しない" do
    create_entry_with_profile(name: "参加確定", status: :accepted, priority: 1)

    get entries_path

    doc = response.parsed_body
    expect(doc.css("table").size).to eq(1)
    expect(response.body).not_to include("キャンセル待ち順位")
  end
end
