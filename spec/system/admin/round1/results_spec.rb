require "rails_helper"

RSpec.describe "Admin::Round1::Results", type: :system do
  describe "GET /admin/round1/results" do
    context "結果が存在する場合" do
      def setup_test_data_and_visit
        # テストデータの作成
        players_data = [
          { rank: 1, score: 250, family_name: "山田", given_name: "太郎", tiebreaker: 1 },
          { rank: 2, score: 200, family_name: "鈴木", given_name: "花子", tiebreaker: 2 },
          { rank: 3, score: 150, family_name: "佐藤", given_name: "一郎", tiebreaker: 3 },
        ]

        players_data.each do |data|
          player = Player.create!
          PlayerProfile.create!(
            player:,
            entry_list_name: "#{data[:family_name]} #{data[:given_name]}",
            family_name: data[:family_name],
            given_name: data[:given_name],
            family_name_kana: "テスト",  # テスト用なのでダミー値
            given_name_kana: "テスト"    # テスト用なのでダミー値
          )
          YontakuPlayerResult.create!(
            player:,
            rank: data[:rank],
            score: data[:score],
            approximation_quiz_diff1: 1,
            approximation_quiz_diff2: 2,
            tiebreaker: data[:tiebreaker]
          )
        end

        sign_in_admin_via_page
        visit "/admin/round1/results"
      end

      it "パンくずリストが表示されること" do
        setup_test_data_and_visit
        within ".breadcrumb" do
          expect(page).to have_content "ペーパー採点"
          expect(page).to have_content "結果"
        end
      end

      it "テーブルのヘッダーが表示されること" do
        setup_test_data_and_visit
        within "thead" do
          expect(page).to have_content "順位"
          expect(page).to have_content "得点"
          expect(page).to have_content "氏名"
        end
      end

      it "結果が順位順に表示されること" do
        setup_test_data_and_visit
        within "tbody" do
          # 1位の情報
          within all("tr")[0] do
            expect(page).to have_content "1"
            expect(page).to have_content "250"
            expect(page).to have_content "山田 太郎"
          end

          # 2位の情報
          within all("tr")[1] do
            expect(page).to have_content "2"
            expect(page).to have_content "200"
            expect(page).to have_content "鈴木 花子"
          end

          # 3位の情報
          within all("tr")[2] do
            expect(page).to have_content "3"
            expect(page).to have_content "150"
            expect(page).to have_content "佐藤 一郎"
          end
        end
      end
    end

    context "結果が存在しない場合" do
      it "テーブルが空であること" do
        sign_in_admin_via_page
        visit "/admin/round1/results"
        expect(page).to have_selector "tbody tr", count: 0
      end
    end
  end
end
