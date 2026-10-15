-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PostLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "postedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduleId" TEXT,
    "groupId" TEXT,
    "postId" TEXT,
    "accountId" TEXT,
    CONSTRAINT "PostLog_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PostLog_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PostLog_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PostLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PostLog" ("accountId", "error", "groupId", "id", "postId", "postedAt", "scheduleId", "status") SELECT "accountId", "error", "groupId", "id", "postId", "postedAt", "scheduleId", "status" FROM "PostLog";
DROP TABLE "PostLog";
ALTER TABLE "new_PostLog" RENAME TO "PostLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
