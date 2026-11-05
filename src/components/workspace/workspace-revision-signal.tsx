import { cookies } from "next/headers"
import { WORKSPACE_REVISION_COOKIE } from "@/lib/workspace-cache-policy"
import { WorkspaceRevision } from "./workspace-revision"

export async function WorkspaceRevisionSignal() {
    return (
        <WorkspaceRevision
            revision={
                (await cookies()).get(WORKSPACE_REVISION_COOKIE)?.value ??
                "initial"
            }
        />
    )
}
