import { testJob } from "../../src/fixtures/job.js";
import {
  loginSuccessfully,
  logout,
  newTestAccount,
  register,
} from "../../src/support/account.js";
import {
  applyToCurrentJob,
  recordRejectedSelectionResult,
  updateApplicationToInterview,
} from "../../src/support/applications.js";
import { verifyGoldenJourneyFinalDashboard } from "../../src/support/dashboard.js";
import {
  finishDemoTimeline,
  startDemoTimeline,
} from "../../src/support/demo-timeline.js";
import { createDeadlineForCurrentApplication } from "../../src/support/deadlines.js";
import {
  addAndEditManualEntry,
  createManualDocument,
  renameManualDocument,
  submitManualDocument,
} from "../../src/support/documents.js";
import {
  createAiDocument,
  findEsEpisodes,
  generateAndHumanEditDraft,
  saveAiDraftAndRevise,
} from "../../src/support/es-ai.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import {
  generateInterviewOutlineAndFollowup,
  generateInterviewQuestions,
  saveInterviewReflection,
  verifyInterviewReflectionPersists,
} from "../../src/support/interview.js";
import {
  evaluateCurrentJob,
  importSyntheticJob,
  openSyntheticJob,
} from "../../src/support/jobs.js";
import {
  approvePersonaUpdateAndFinishReevaluation,
  proposePersonaUpdate,
  verifyPersonaStillV1BeforeApproval,
  verifyPersonaV2AndFreshScore,
} from "../../src/support/persona-update.js";
import { createPersonaFromFixture } from "../../src/support/persona.js";
import { expect, test as baseTest } from "../../src/support/test.js";

// Keep the CSS viewport mobile-sized. The runner upscales the finished portrait
// recording to 1080x2340 so the mobile layout fills the video frame.
baseTest.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  hasTouch: true,
  isMobile: true,
  video: {
    mode: "on",
    size: { width: 390, height: 844 },
  },
});

baseTest.describe("Mobile demo — S14 Golden Journey全14step", () => {
  baseTest(
    "records the complete Prizgram product story as one portrait evidence video",
    async ({ page }, testInfo) => {
      baseTest.setTimeout(0);
      startDemoTimeline();

      try {
        assertMutationAllowed();
        const account = newTestAccount("mobile-s14-golden");
        await evidenceStep(page, testInfo, "01 新規登録してPrizgramを開始", async () => {
        await register(page, account);
        });

        await evidenceStep(page, testInfo, "02 6問ヒアリングからPersona v1を生成", async () => {
        await createPersonaFromFixture(page);
        await expect(page.getByText(/v1/).first()).toBeVisible();
        });

        await evidenceStep(page, testInfo, "03 synthetic求人を取り込み根拠付き3軸評価", async () => {
        await importSyntheticJob(page);
        await openSyntheticJob(page);
        await evaluateCurrentJob(page);
        });

        await evidenceStep(page, testInfo, "04 求人から応募を作成して面接フェーズへ進める", async () => {
        await applyToCurrentJob(page);
        await updateApplicationToInterview(page);
        });
        const applicationUrl = page.url();

        await evidenceStep(page, testInfo, "05 ES締切を登録", async () => {
        await createDeadlineForCurrentApplication(page);
        });

        await evidenceStep(page, testInfo, "06 手動ESを作成編集して提出済みにする", async () => {
        await page.goto(applicationUrl);
        await createManualDocument(page);
        await renameManualDocument(page);
        await addAndEditManualEntry(page);
        await submitManualDocument(page);
        });

        await evidenceStep(page, testInfo, "07 ES AI支援で経験選択から下書き添削まで実行", async () => {
        await createAiDocument(page);
        await findEsEpisodes(page);
        const humanEditedDraft = await generateAndHumanEditDraft(page);
        await saveAiDraftAndRevise(page, humanEditedDraft);
        });

        await evidenceStep(page, testInfo, "08 面接想定質問から回答骨子と深掘りを生成", async () => {
        await generateInterviewQuestions(page);
        await generateInterviewOutlineAndFollowup(page);
        });

        await evidenceStep(page, testInfo, "09 面接後振り返りを保存して永続化確認", async () => {
        await saveInterviewReflection(page);
        await verifyInterviewReflectionPersists(page);
        });

        await evidenceStep(page, testInfo, "10 選考結果として落選を登録", async () => {
        await recordRejectedSelectionResult(page);
        });

        await evidenceStep(page, testInfo, "11 振り返りからPersona更新案を作るが未承認ではv1維持", async () => {
        await proposePersonaUpdate(page);
        await verifyPersonaStillV1BeforeApproval(page);
        });

        await evidenceStep(page, testInfo, "12 明示承認でPersona v2を作り求人を再評価", async () => {
        await approvePersonaUpdateAndFinishReevaluation(page);
        await verifyPersonaV2AndFreshScore(page);
        });

        await evidenceStep(page, testInfo, "13 最終dashboardに結果とPersona v2が反映", async () => {
        await verifyGoldenJourneyFinalDashboard(page);
        });

        await evidenceStep(page, testInfo, "14 ログアウト再ログイン後も状態が永続化", async () => {
        await logout(page);
        await loginSuccessfully(page, account.loginId, account.password);
        await page.goto("/app/persona");
        await expect(page.locator(".page-lead")).toContainText("バージョン2");
        await page.goto("/app/applications?status=rejected");
        const application = page
          .getByRole("region", { name: "応募一覧" })
          .getByRole("link", { name: new RegExp(testJob.companyName) });
        await expect(application).toBeVisible();
        await expect(application).toContainText("落選");
        });
      } finally {
        await finishDemoTimeline(testInfo.outputPath("mobile-demo-timeline.json"));
      }
    },
  );
});
