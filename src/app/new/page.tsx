import { WorksheetForm } from "@/components/worksheet/WorksheetForm"

export default function NewEntryPage() {
    return (
        <div className="container max-w-md mx-auto py-6 px-4">
            <h1 className="text-2xl font-bold mb-6 text-center">感情の整理</h1>
            <WorksheetForm />
        </div>
    )
}
