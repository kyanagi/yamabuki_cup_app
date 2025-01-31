require "rails_helper"

RSpec.describe QuestionClosing do
  let(:question) { create(:question) }
  let(:players) { create_list(:player, 3) }

  before do
    create(:question_allocation, question: question)
  end

  context "question_idが存在しないIDのとき" do
    let(:question_closing) do
      QuestionClosing.new(
        question_id: 0,
        question_player_results_attributes: [
          { player_id: players[0].id, result: "wrong", situation: "pushed" },
        ]
      )
    end

    it "valid?がfalseを返すこと" do
      expect(question_closing).not_to be_valid
    end

    it "saveがfalseを返すこと" do
      expect(question_closing.save).to be false
    end

    it "QuestionResultが作成されないこと" do
      expect { question_closing.save }.not_to change(QuestionResult, :count)
    end

    it "QuestionPlayerResultが作成されないこと" do
      expect { question_closing.save }.not_to change(QuestionPlayerResult, :count)
    end
  end

  context "player_idが存在しないIDのとき" do
    let(:question_closing) do
      QuestionClosing.new(
        question_id: question.id,
        question_player_results_attributes: [
          { player_id: players[0].id, result: "wrong", situation: "pushed" },
          { player_id: 0, result: "wrong", situation: "unpushed" },
        ]
      )
    end

    it "valid?がfalseを返すこと" do
      expect(question_closing).not_to be_valid
    end

    it "saveがfalseを返すこと" do
      expect(question_closing.save).to be false
    end

    it "QuestionResultが作成されないこと" do
      expect { question_closing.save }.not_to change(QuestionResult, :count)
    end

    it "QuestionPlayerResultが作成されないこと" do
      expect { question_closing.save }.not_to change(QuestionPlayerResult, :count)
    end
  end

  def setup_match_rule_mock
    rule = instance_double(MatchRule::Round2)
    allow_any_instance_of(QuestionResult).to receive_message_chain(:match, :rule).and_return(rule)
    expect(rule).to receive(:process) do |question_player_results|
      expect(question_player_results).to all be_a QuestionPlayerResult
    end
  end

  context "早押しシングルチャンス・正解" do
    let(:question_closing) do
      QuestionClosing.new(
        question_id: question.id,
        question_player_results_attributes: [
          { player_id: players[0].id, result: "correct", situation: "pushed" },
        ]
      )
    end

    before do
      setup_match_rule_mock
    end

    it "QuestionResultとQuestionPlayerResultが作成されること" do
      expect { question_closing.save! }
        .to change(QuestionResult, :count).by(1)
        .and change(QuestionPlayerResult, :count).by(1)

      r = QuestionResult.last
      expect(r.question_allocation.question_id).to eq question.id

      pr = QuestionPlayerResult.last
      expect(pr.question_result.id).to eq r.id
      expect(pr.player_id).to eq players[0].id
      expect(pr.result).to eq "correct"
      expect(pr.situation).to eq "pushed"
    end
  end

  context "早押しシングルチャンス・誤答" do
    let(:question_closing) do
      QuestionClosing.new(
        question_id: question.id,
        question_player_results_attributes: [
          { player_id: players[0].id, result: "wrong", situation: "pushed" },
        ]
      )
    end

    before do
      setup_match_rule_mock
    end

    it "QuestionResultとQuestionPlayerResultが作成されること" do
      expect { question_closing.save! }
        .to change(QuestionResult, :count).by(1)
        .and change(QuestionPlayerResult, :count).by(1)

      r = QuestionResult.last
      expect(r.question_allocation.question_id).to eq question.id

      pr = QuestionPlayerResult.last
      expect(pr.question_result.id).to eq r.id
      expect(pr.player_id).to eq players[0].id
      expect(pr.result).to eq "wrong"
      expect(pr.situation).to eq "pushed"
    end
  end

  context "早押しシングルチャンス・スルー" do
    let(:question_closing) do
      QuestionClosing.new(
        question_id: question.id,
        question_player_results_attributes: []
      )
    end

    before do
      setup_match_rule_mock
    end

    it "QuestionResultが作成され、QuestionPlayerResultが作成されないこと" do
      expect { question_closing.save! }
        .to change(QuestionResult, :count).by(1)
        .and change(QuestionPlayerResult, :count).by(0)

      r = QuestionResult.last
      expect(r.question_allocation.question_id).to eq question.id
    end
  end

  context "早押しボード・押して正解" do
    let(:question_closing) do
      QuestionClosing.new(
        question_id: question.id,
        question_player_results_attributes: [
          { player_id: players[0].id, result: "correct", situation: "pushed" },
          { player_id: players[1].id, result: "wrong", situation: "unpushed" },
          { player_id: players[2].id, result: "correct", situation: "unpushed" },
        ]
      )
    end

    before do
      setup_match_rule_mock
    end

    it "QuestionResultとQuestionPlayerResultが作成されること" do
      expect { question_closing.save! }
        .to change(QuestionResult, :count).by(1)
        .and change(QuestionPlayerResult, :count).by(3)

      r = QuestionResult.last
      expect(r.question_allocation.question_id).to eq question.id

      prs = QuestionPlayerResult.all
      expect(prs.map(&:question_result).uniq).to eq [r]
      expect(prs.map(&:player_id)).to eq [players[0].id, players[1].id, players[2].id]
      expect(prs.map(&:result)).to eq ["correct", "wrong", "correct"]
      expect(prs.map(&:situation)).to eq ["pushed", "unpushed", "unpushed"]
    end
  end

  context "早押しボード・押して誤答" do
    let(:question_closing) do
      QuestionClosing.new(
        question_id: question.id,
        question_player_results_attributes: [
          { player_id: players[0].id, result: "wrong", situation: "pushed" },
          { player_id: players[1].id, result: "correct", situation: "unpushed" },
          { player_id: players[2].id, result: "wrong", situation: "unpushed" },
        ]
      )
    end

    before do
      setup_match_rule_mock
    end

    it "QuestionResultとQuestionPlayerResultが作成されること" do
      expect { question_closing.save! }
        .to change(QuestionResult, :count).by(1)
        .and change(QuestionPlayerResult, :count).by(3)

      r = QuestionResult.last
      expect(r.question_allocation.question_id).to eq question.id

      prs = QuestionPlayerResult.all
      expect(prs.map(&:question_result).uniq).to eq [r]
      expect(prs.map(&:player_id)).to eq [players[0].id, players[1].id, players[2].id]
      expect(prs.map(&:result)).to eq ["wrong", "correct", "wrong"]
      expect(prs.map(&:situation)).to eq ["pushed", "unpushed", "unpushed"]
    end
  end

  context "早押しボード・スルーボード / 全体ボード" do
    let(:question_closing) do
      QuestionClosing.new(
        question_id: question.id,
        question_player_results_attributes: [
          { player_id: players[0].id, result: "wrong", situation: "unpushed" },
          { player_id: players[1].id, result: "wrong", situation: "unpushed" },
          { player_id: players[2].id, result: "correct", situation: "unpushed" },
        ]
      )
    end

    before do
      setup_match_rule_mock
    end

    it "QuestionResultとQuestionPlayerResultが作成されること" do
      expect { question_closing.save! }
        .to change(QuestionResult, :count).by(1)
        .and change(QuestionPlayerResult, :count).by(3)

      r = QuestionResult.last
      expect(r.question_allocation.question_id).to eq question.id

      prs = QuestionPlayerResult.all
      expect(prs.map(&:question_result).uniq).to eq [r]
      expect(prs.map(&:player_id)).to eq [players[0].id, players[1].id, players[2].id]
      expect(prs.map(&:result)).to eq ["wrong", "wrong", "correct"]
      expect(prs.map(&:situation)).to eq ["unpushed", "unpushed", "unpushed"]
    end
  end
end
