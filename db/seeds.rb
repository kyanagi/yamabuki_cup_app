# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

[
  { id: 21, name: "2R 第1組", round_id: Round::ROUND2.id, match_number: 1, rule_name: "MatchRule::Round2" },
  { id: 22, name: "2R 第2組", round_id: Round::ROUND2.id, match_number: 2, rule_name: "MatchRule::Round2" },
  { id: 23, name: "2R 第3組", round_id: Round::ROUND2.id, match_number: 3, rule_name: "MatchRule::Round2" },
  { id: 24, name: "2R 第4組", round_id: Round::ROUND2.id, match_number: 4, rule_name: "MatchRule::Round2" },
  { id: 25, name: "2R 第5組", round_id: Round::ROUND2.id, match_number: 5, rule_name: "MatchRule::Round2" },
  { id: 31, name: "3R A 7◯3×", round_id: Round::ROUND3.id, match_number: 1, rule_name: "MatchRule::Round3Hayaoshi73" },
  { id: 32, name: "3R B 7◯1×", round_id: Round::ROUND3.id, match_number: 2, rule_name: "MatchRule::Round3Hayaoshi71" },
  { id: 33, name: "3R C 早押しボード", round_id: Round::ROUND3.id, match_number: 3, rule_name: "MatchRule::Round3Hayabo" },
  { id: 34, name: "3R D 早押しボード2", round_id: Round::ROUND3.id, match_number: 4, rule_name: "MatchRule::Round3Hayabo2" },
  { id: 41, name: "準々決勝 第1組", round_id: Round::QUARTER_FINAL.id, match_number: 1, rule_name: "MatchRule::QuarterFinal" },
  { id: 42, name: "準々決勝 第2組", round_id: Round::QUARTER_FINAL.id, match_number: 2, rule_name: "MatchRule::QuarterFinal" },
].each do |match_attr|
  m = Match.find_or_initialize_by(id: match_attr[:id])
  m.update!(match_attr)
end
