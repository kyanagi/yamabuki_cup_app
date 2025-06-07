require "rails_helper"

RSpec.describe PaperQuizGrading, type: :model do
  let(:players) { create_list(:player, 3) }

  before do
    # 四択クイズの問題を作成
    300.times do |i|
      create(:yontaku_question, id: i + 1, answer: (i % 4) + 1)
    end

    # 近似値クイズの問題を作成
    create(:approximation_question, id: 1, answer: 100)
    create(:approximation_question, id: 2, answer: 200)
  end

  describe "#process" do
    describe "四択クイズの採点" do
      before do
        # プレイヤー1: 全問正解
        create(:yontaku_player_paper, player: players[0], paper_number: 1, answers: Array.new(200) { |i| (i % 4) + 1 }.map(&:to_s).to_json)
        create(:yontaku_player_paper, player: players[0], paper_number: 2, answers: Array.new(100) { |i| (i % 4) + 1 }.map(&:to_s).to_json)

        # プレイヤー2: 1枚目は全問正解、2枚目は全問不正解
        create(:yontaku_player_paper, player: players[1], paper_number: 1, answers: Array.new(200) { |i| (i % 4) + 1 }.map(&:to_s).to_json)
        create(:yontaku_player_paper, player: players[1], paper_number: 2, answers: Array.new(100) { 5 }.map(&:to_s).to_json)

        # プレイヤー3: 解答用紙なし
      end

      it "正解数が正しく計算されること" do
        PaperQuizGrading.create!
        players.each(&:reload)

        expect(players[0].yontaku_player_result.score).to eq(300)
        expect(players[1].yontaku_player_result.score).to eq(200)
        expect(players[2].yontaku_player_result).to be_nil
      end
    end

    describe "近似値クイズの誤差計算" do
      before do
        # 採点対象となるようダミーの解答用紙を作成
        create(:yontaku_player_paper, player: players[0], paper_number: 1, answers: Array.new(200, 1).map(&:to_s).to_json)
        create(:yontaku_player_paper, player: players[0], paper_number: 2, answers: Array.new(100, 1).map(&:to_s).to_json)
        create(:yontaku_player_paper, player: players[1], paper_number: 1, answers: Array.new(200, 1).map(&:to_s).to_json)
        create(:yontaku_player_paper, player: players[1], paper_number: 2, answers: Array.new(100, 1).map(&:to_s).to_json)
        # プレイヤー1: 両方回答
        create(:approximation_quiz_answer, player: players[0], answer1: 90, answer2: 220)

        # プレイヤー2: 1問目のみ回答
        create(:approximation_quiz_answer, player: players[1], answer1: 115, answer2: nil)

        # プレイヤー3: 無回答
      end

      it "正しく誤差が計算されること" do
        PaperQuizGrading.create!
        players.each(&:reload)

        expect(players[0].yontaku_player_result.approximation_quiz_diff1).to eq(10)
        expect(players[0].yontaku_player_result.approximation_quiz_diff2).to eq(20)
        expect(players[1].yontaku_player_result.approximation_quiz_diff1).to eq(15)
        expect(players[1].yontaku_player_result.approximation_quiz_diff2).to eq(10_0000_0000)
        expect(players[2].yontaku_player_result).to be_nil
      end
    end

    describe "順位付け" do
      context "四択クイズの点数が異なる場合" do
        it "四択クイズの点数が高い方が順位が高くなること" do
          # プレイヤー1: 全問正解、近似値は誤差あり
          create(:yontaku_player_paper, player: players[0], paper_number: 1, answers: Array.new(200) { (it % 4) + 1 }.map(&:to_s).to_json)
          create(:yontaku_player_paper, player: players[0], paper_number: 2, answers: Array.new(100) { (it % 4) + 1 }.map(&:to_s).to_json)
          create(:approximation_quiz_answer, player: players[0], answer1: 90, answer2: 210)

          # プレイヤー2: 1枚目は全問正解、2枚目は全問不正解、近似値は誤差なし
          create(:yontaku_player_paper, player: players[1], paper_number: 1, answers: Array.new(200) { (it % 4) + 1 }.map(&:to_s).to_json)
          create(:yontaku_player_paper, player: players[1], paper_number: 2, answers: Array.new(100) { 5 }.map(&:to_s).to_json)
          create(:approximation_quiz_answer, player: players[1], answer1: 100, answer2: 200)

          PaperQuizGrading.create!
          players.each(&:reload)

          expect(players[0].yontaku_player_result.rank).to eq(1)
          expect(players[1].yontaku_player_result.rank).to eq(2)
          expect(players[2].yontaku_player_result).to be_nil
        end
      end

      context "四択クイズの点数が同じで、近似値1の誤差が異なる場合" do
        it "近似値1の誤差が小さい方が順位が高くなること" do
          # 両プレイヤーとも全問正解
          create(:yontaku_player_paper, player: players[0], paper_number: 1, answers: Array.new(200) { (it % 4) + 1 }.map(&:to_s).to_json)
          create(:yontaku_player_paper, player: players[0], paper_number: 2, answers: Array.new(100) { (it % 4) + 1 }.map(&:to_s).to_json)
          create(:yontaku_player_paper, player: players[1], paper_number: 1, answers: Array.new(200) { (it % 4) + 1 }.map(&:to_s).to_json)
          create(:yontaku_player_paper, player: players[1], paper_number: 2, answers: Array.new(100) { (it % 4) + 1 }.map(&:to_s).to_json)

          # プレイヤー1: 近似値1の誤差が小さい
          create(:approximation_quiz_answer, player: players[0], answer1: 90, answer2: 210)
          # プレイヤー2: 近似値1の誤差が大きい
          create(:approximation_quiz_answer, player: players[1], answer1: 50, answer2: 210)

          PaperQuizGrading.create!
          players.each(&:reload)

          expect(players[0].yontaku_player_result.rank).to eq(1)
          expect(players[1].yontaku_player_result.rank).to eq(2)
          expect(players[2].yontaku_player_result).to be_nil
        end
      end

      context "四択クイズの点数と近似値1の誤差が同じで、近似値2の誤差が異なる場合" do
        it "近似値2の誤差が小さい方が順位が高くなること" do
          # 両プレイヤーとも全問正解
          create(:yontaku_player_paper, player: players[0], paper_number: 1, answers: Array.new(200) { (it % 4) + 1 }.map(&:to_s).to_json)
          create(:yontaku_player_paper, player: players[0], paper_number: 2, answers: Array.new(100) { (it % 4) + 1 }.map(&:to_s).to_json)
          create(:yontaku_player_paper, player: players[1], paper_number: 1, answers: Array.new(200) { (it % 4) + 1 }.map(&:to_s).to_json)
          create(:yontaku_player_paper, player: players[1], paper_number: 2, answers: Array.new(100) { (it % 4) + 1 }.map(&:to_s).to_json)

          # 両プレイヤーとも近似値1の誤差は同じ
          create(:approximation_quiz_answer, player: players[0], answer1: 90, answer2: 250)
          create(:approximation_quiz_answer, player: players[1], answer1: 90, answer2: 190)

          PaperQuizGrading.create!
          players.each(&:reload)

          expect(players[0].yontaku_player_result.rank).to eq(2)
          expect(players[1].yontaku_player_result.rank).to eq(1)
          expect(players[2].yontaku_player_result).to be_nil
        end
      end

      context "四択クイズの点数、近似値1の誤差、近似値2の誤差が同じ場合" do
        it "タイブレーカーの数値が小さい方が順位が高くなること" do
          # 両プレイヤーとも全問正解
          create(:yontaku_player_paper, player: players[0], paper_number: 1, answers: Array.new(200) { (it % 4) + 1 }.map(&:to_s).to_json)
          create(:yontaku_player_paper, player: players[0], paper_number: 2, answers: Array.new(100) { (it % 4) + 1 }.map(&:to_s).to_json)
          create(:yontaku_player_paper, player: players[1], paper_number: 1, answers: Array.new(200) { (it % 4) + 1 }.map(&:to_s).to_json)
          create(:yontaku_player_paper, player: players[1], paper_number: 2, answers: Array.new(100) { (it % 4) + 1 }.map(&:to_s).to_json)

          # 両プレイヤーとも近似値クイズの誤差は同じ
          create(:approximation_quiz_answer, player: players[0], answer1: 90, answer2: 190)
          create(:approximation_quiz_answer, player: players[1], answer1: 90, answer2: 190)

          PaperQuizGrading.create!
          players.each(&:reload)

          players_sorted_by_tiebreaker = players.select(&:yontaku_player_result).sort_by { it.yontaku_player_result.tiebreaker }
          players_sorted_by_rank = players.select(&:yontaku_player_result).sort_by { it.yontaku_player_result.rank }
          expect(players_sorted_by_rank).to eq(players_sorted_by_tiebreaker)

          expect(players[2].yontaku_player_result).to be_nil
        end
      end
    end

    context "エラーケース" do
      it "解答用紙の問題数が不正な場合にエラーになること" do
        create(:yontaku_player_paper, player: players[0], paper_number: 1, answers: Array.new(199).map(&:to_s).to_json)

        expect do
          PaperQuizGrading.create!
        end.to raise_error("解答用紙の問題数が不正です: player_id=#{players[0].id}")
      end
    end
  end
end
