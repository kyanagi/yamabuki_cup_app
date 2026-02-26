import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupControllerTest, teardownControllerTest } from "../../__tests__/helpers/stimulus-test-helper";
import PlayerNameLookupController from "../player_name_lookup_controller";

function createHTML(): string {
  return `
    <table>
      <tbody>
        <tr data-controller="player-name-lookup">
          <td>
            <input type="number"
                   data-player-name-lookup-target="playerId"
                   data-action="input->player-name-lookup#lookup" />
          </td>
          <td data-player-name-lookup-target="playerName"></td>
        </tr>
      </tbody>
    </table>
  `;
}

describe("PlayerNameLookupController", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("lookup()", () => {
    it("IDを入力するとデバウンス後にAPIを呼び出し、氏名を表示する", async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: "山田 太郎" }),
      });

      const { application, element } = await setupControllerTest<PlayerNameLookupController>(
        PlayerNameLookupController,
        createHTML(),
        "player-name-lookup",
      );

      // Stimulusセットアップ後にfake timersを有効化
      vi.useFakeTimers();

      const playerIdInput = element.querySelector('[data-player-name-lookup-target="playerId"]') as HTMLInputElement;
      const playerNameCell = element.querySelector('[data-player-name-lookup-target="playerName"]') as HTMLElement;

      // Act
      playerIdInput.value = "123";
      playerIdInput.dispatchEvent(new Event("input"));

      // Assert: デバウンス中はまだfetchされない
      expect(mockFetch).not.toHaveBeenCalled();

      // デバウンス待機（300ms）
      await vi.advanceTimersByTimeAsync(300);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith("/admin/round1/players/123", {
        credentials: "same-origin",
        signal: expect.any(AbortSignal),
      });
      expect(playerNameCell.textContent).toBe("山田 太郎");

      // Cleanup
      teardownControllerTest(application);
    });

    it("存在しないプレイヤーの場合は「（不明）」を表示する", async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { application, element } = await setupControllerTest<PlayerNameLookupController>(
        PlayerNameLookupController,
        createHTML(),
        "player-name-lookup",
      );

      vi.useFakeTimers();

      const playerIdInput = element.querySelector('[data-player-name-lookup-target="playerId"]') as HTMLInputElement;
      const playerNameCell = element.querySelector('[data-player-name-lookup-target="playerName"]') as HTMLElement;

      // Act
      playerIdInput.value = "99999";
      playerIdInput.dispatchEvent(new Event("input"));
      await vi.advanceTimersByTimeAsync(300);

      // Assert
      expect(playerNameCell.textContent).toBe("（不明）");

      // Cleanup
      teardownControllerTest(application);
    });

    it("空のIDの場合はAPIを呼び出さず、氏名をクリアする", async () => {
      // Arrange
      const { application, element } = await setupControllerTest<PlayerNameLookupController>(
        PlayerNameLookupController,
        createHTML(),
        "player-name-lookup",
      );

      vi.useFakeTimers();

      const playerIdInput = element.querySelector('[data-player-name-lookup-target="playerId"]') as HTMLInputElement;
      const playerNameCell = element.querySelector('[data-player-name-lookup-target="playerName"]') as HTMLElement;

      // 事前に何か表示しておく
      playerNameCell.textContent = "既存の名前";

      // Act
      playerIdInput.value = "";
      playerIdInput.dispatchEvent(new Event("input"));
      await vi.advanceTimersByTimeAsync(300);

      // Assert
      expect(mockFetch).not.toHaveBeenCalled();
      expect(playerNameCell.textContent).toBe("");

      // Cleanup
      teardownControllerTest(application);
    });

    it("連続入力時はデバウンスで最後のリクエストのみ実行される", async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: "最終結果" }),
      });

      const { application, element } = await setupControllerTest<PlayerNameLookupController>(
        PlayerNameLookupController,
        createHTML(),
        "player-name-lookup",
      );

      vi.useFakeTimers();

      const playerIdInput = element.querySelector('[data-player-name-lookup-target="playerId"]') as HTMLInputElement;

      // Act: 連続で入力
      playerIdInput.value = "1";
      playerIdInput.dispatchEvent(new Event("input"));
      await vi.advanceTimersByTimeAsync(100);

      playerIdInput.value = "12";
      playerIdInput.dispatchEvent(new Event("input"));
      await vi.advanceTimersByTimeAsync(100);

      playerIdInput.value = "123";
      playerIdInput.dispatchEvent(new Event("input"));
      await vi.advanceTimersByTimeAsync(300);

      // Assert: 最後のIDでのみfetchされる
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith("/admin/round1/players/123", expect.any(Object));

      // Cleanup
      teardownControllerTest(application);
    });

    it("レスポンス受信時に入力値が変わっていたら更新しない", async () => {
      // Arrange
      let resolveFirstFetch!: (value: unknown) => void;
      const firstFetchPromise = new Promise((resolve) => {
        resolveFirstFetch = resolve;
      });

      mockFetch.mockImplementation((url: string) => {
        if (url.includes("/1")) {
          return firstFetchPromise;
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ name: "新しい名前" }),
        });
      });

      const { application, element } = await setupControllerTest<PlayerNameLookupController>(
        PlayerNameLookupController,
        createHTML(),
        "player-name-lookup",
      );

      vi.useFakeTimers();

      const playerIdInput = element.querySelector('[data-player-name-lookup-target="playerId"]') as HTMLInputElement;
      const playerNameCell = element.querySelector('[data-player-name-lookup-target="playerName"]') as HTMLElement;

      // Act: 最初のリクエストを開始
      playerIdInput.value = "1";
      playerIdInput.dispatchEvent(new Event("input"));
      await vi.advanceTimersByTimeAsync(300);

      // 入力値を変更（レスポンス前に）
      playerIdInput.value = "2";
      playerIdInput.dispatchEvent(new Event("input"));
      await vi.advanceTimersByTimeAsync(300);

      // 最初のリクエストを完了（古いレスポンス）
      resolveFirstFetch({
        ok: true,
        json: () => Promise.resolve({ name: "古い名前" }),
      });

      // 非同期処理を待つ
      await vi.runAllTimersAsync();

      // Assert: 新しい名前が表示される（古い名前で上書きされない）
      expect(playerNameCell.textContent).toBe("新しい名前");

      // Cleanup
      teardownControllerTest(application);
    });
  });
});
