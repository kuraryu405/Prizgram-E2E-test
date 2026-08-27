import { newTestAccount, register } from "../../src/support/account.js";
import { evidenceStep } from "../../src/support/evidence.js";
import { assertMutationAllowed } from "../../src/support/env.js";
import {
  canRunLocalReminderGenerator,
  createReminderEligibleDeadline,
  runLocalReminderGenerator,
  verifyAndDismissReminder,
} from "../../src/support/reminders.js";
import { test } from "../../src/support/test.js";

test.describe("S11 reminders", () => {
  test("generate a deadline reminder and dismiss it", async ({ page }, testInfo) => {
    assertMutationAllowed();
    test.skip(
      !(await canRunLocalReminderGenerator()),
      "Reminder generation needs a local Prizgram checkout and database access. Set E2E_PRIZGRAM_REPO and E2E_DATABASE_URL.",
    );

    const account = newTestAccount("s11-reminders");
    await register(page, account);

    await evidenceStep(page, testInfo, "リマインダー対象の応募と締切を作成", async () => {
      await createReminderEligibleDeadline(page);
    });

    await test.step("Prizgram本体のreminder generatorを変更せず実行", async () => {
      await runLocalReminderGenerator(testInfo);
    });

    await evidenceStep(page, testInfo, "生成されたリマインダーを確認して解除", async () => {
      await verifyAndDismissReminder(page);
    });
  });
});
