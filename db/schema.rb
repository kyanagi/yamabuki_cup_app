# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_05_16_085852) do
  create_table "matches", force: :cascade do |t|
    t.integer "round_id", null: false
    t.integer "match_number", null: false
    t.string "name", default: "", null: false
    t.string "rule_name", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "matchings", force: :cascade do |t|
    t.integer "match_id", null: false
    t.integer "seat", null: false
    t.integer "player_id", null: false
    t.string "status"
    t.integer "points", default: 0, null: false
    t.integer "misses", default: 0, null: false
    t.integer "stars", default: 0, null: false
    t.integer "rank"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["match_id", "player_id"], name: "index_matchings_on_match_id_and_player_id", unique: true
    t.index ["match_id"], name: "index_matchings_on_match_id"
    t.index ["player_id"], name: "index_matchings_on_player_id"
  end

  create_table "player_profiles", force: :cascade do |t|
    t.integer "player_id", null: false
    t.string "entry_list_name", default: "", null: false
    t.string "family_name", default: "", null: false
    t.string "family_name_kana", default: "", null: false
    t.string "given_name", default: "", null: false
    t.string "given_name_kana", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["player_id"], name: "index_player_profiles_on_player_id"
  end

  create_table "players", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "question_allocations", force: :cascade do |t|
    t.integer "match_id", null: false
    t.integer "question_id", null: false
    t.integer "order", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["match_id", "order"], name: "index_question_allocations_on_match_id_and_order", unique: true
    t.index ["match_id"], name: "index_question_allocations_on_match_id"
    t.index ["question_id"], name: "index_question_allocations_on_question_id", unique: true
  end

  create_table "question_player_results", force: :cascade do |t|
    t.integer "player_id", null: false
    t.integer "question_result_id", null: false
    t.integer "result", null: false
    t.integer "situation", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["player_id"], name: "index_question_player_results_on_player_id"
    t.index ["question_result_id"], name: "index_question_player_results_on_question_result_id"
  end

  create_table "question_providers", force: :cascade do |t|
    t.integer "next_question_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["next_question_id"], name: "index_question_providers_on_next_question_id"
  end

  create_table "question_results", force: :cascade do |t|
    t.integer "question_allocation_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["question_allocation_id"], name: "index_question_results_on_question_allocation_id"
  end

  create_table "questions", force: :cascade do |t|
    t.string "text", default: "", null: false
    t.string "answer", default: "", null: false
    t.string "another_answer", default: "", null: false
    t.string "note", default: "", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "round3_course_preferences", force: :cascade do |t|
    t.integer "player_id", null: false
    t.integer "choice1_match_id", null: false
    t.integer "choice2_match_id", null: false
    t.integer "choice3_match_id", null: false
    t.integer "choice4_match_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["choice1_match_id"], name: "index_round3_course_preferences_on_choice1_match_id"
    t.index ["choice2_match_id"], name: "index_round3_course_preferences_on_choice2_match_id"
    t.index ["choice3_match_id"], name: "index_round3_course_preferences_on_choice3_match_id"
    t.index ["choice4_match_id"], name: "index_round3_course_preferences_on_choice4_match_id"
    t.index ["player_id"], name: "index_round3_course_preferences_on_player_id"
  end

  create_table "yontaku_player_results", force: :cascade do |t|
    t.integer "player_id", null: false
    t.integer "rank", null: false
    t.integer "score", default: 0, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["player_id"], name: "index_yontaku_player_results_on_player_id", unique: true
    t.index ["rank"], name: "index_yontaku_player_results_on_rank", unique: true
  end

  add_foreign_key "matchings", "matches"
  add_foreign_key "matchings", "players"
  add_foreign_key "player_profiles", "players"
  add_foreign_key "question_allocations", "matches"
  add_foreign_key "question_allocations", "questions"
  add_foreign_key "question_player_results", "players"
  add_foreign_key "question_player_results", "question_results"
  add_foreign_key "question_providers", "questions", column: "next_question_id"
  add_foreign_key "question_results", "question_allocations"
  add_foreign_key "round3_course_preferences", "matches", column: "choice1_match_id"
  add_foreign_key "round3_course_preferences", "matches", column: "choice2_match_id"
  add_foreign_key "round3_course_preferences", "matches", column: "choice3_match_id"
  add_foreign_key "round3_course_preferences", "matches", column: "choice4_match_id"
  add_foreign_key "round3_course_preferences", "players"
  add_foreign_key "yontaku_player_results", "players"
end
