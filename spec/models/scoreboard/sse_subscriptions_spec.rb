require "rails_helper"

RSpec.describe Scoreboard::SseSubscriptions do
  # EventBroadcaster.instance をモックして委譲のみ検証する
  let(:broadcaster) do
    instance_double(Scoreboard::EventBroadcaster, register: nil, unregister: nil)
  end

  before do
    allow(Scoreboard::EventBroadcaster).to receive(:instance).and_return(broadcaster)
  end

  describe "#subscribe_all" do
    it "broadcaster にキューを登録する" do
      queue = Thread::Queue.new
      subs = described_class.new(queue)
      subs.subscribe_all
      expect(broadcaster).to have_received(:register).with(queue)
    end

    it "subscribe_all を2回呼んでも登録は1回だけ" do
      queue = Thread::Queue.new
      subs = described_class.new(queue)
      subs.subscribe_all
      subs.subscribe_all
      expect(broadcaster).to have_received(:register).with(queue).once
    end
  end

  describe "#unsubscribe_all" do
    it "broadcaster からキューを解除する" do
      queue = Thread::Queue.new
      subs = described_class.new(queue)
      subs.subscribe_all
      subs.unsubscribe_all
      expect(broadcaster).to have_received(:unregister).with(queue)
    end

    it "subscribe_all していない状態で unsubscribe_all を呼んでも登録解除は実行されない" do
      queue = Thread::Queue.new
      subs = described_class.new(queue)
      subs.unsubscribe_all
      expect(broadcaster).not_to have_received(:unregister)
    end

    it "unsubscribe_all 後に再度 subscribe_all すると再登録される" do
      queue = Thread::Queue.new
      subs = described_class.new(queue)
      subs.subscribe_all
      subs.unsubscribe_all
      subs.subscribe_all
      expect(broadcaster).to have_received(:register).with(queue).twice
    end
  end
end
