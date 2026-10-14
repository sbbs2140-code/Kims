import { StatefulForm } from "@/components/exam/stateful-form";
import { requireAdmin } from "@/lib/exam/auth";
import { DEFAULT_MAX_DAY, DEFAULT_SCORES, LABELS } from "@/lib/exam/config";
import { db, type Settings } from "@/lib/exam/db";
import { card, hint, input, label } from "@/lib/exam/ui";
import { saveSettingsAction } from "../../actions";

export default async function SettingsPage() {
  await requireAdmin();
  const { data } = await db().from("exam_settings").select("*").eq("id", 1).single();
  const s: Settings = data ?? {
    score_main: DEFAULT_SCORES.main,
    score_sub: DEFAULT_SCORES.sub,
    score_free: DEFAULT_SCORES.free,
    max_day_exam: DEFAULT_MAX_DAY.exam,
    max_day_free: DEFAULT_MAX_DAY.free,
  };

  const fields: { name: keyof Settings; text: string; step?: string; note: string }[] = [
    { name: "score_main", text: `${LABELS.roleMain} 점수`, step: "0.1", note: "1교시를 정감독으로 서면 더해지는 점수" },
    { name: "score_sub", text: `${LABELS.roleSub} 점수`, step: "0.1", note: "정감독보다 같거나 낮아야 함" },
    { name: "score_free", text: `${LABELS.roleFree} 점수`, step: "0.1", note: "부감독보다 같거나 낮아야 함" },
    { name: "max_day_exam", text: "하루 최대 감독 교시 (정감독+부감독)", note: "한 선생님이 하루에 시험 감독을 설 수 있는 교시 수" },
    { name: "max_day_free", text: "하루 최대 자율감독 교시", note: "자율감독은 시험 감독과 따로 셈" },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl leading-[1.25] font-bold tracking-[-0.02em] lg:text-4xl">점수 설정</h1>
        <p className="mt-4 max-w-[40rem] text-base text-text-muted">
          공정성 계산에 쓰는 값입니다. 선생님별 점수 합계의 차이가 가장 작아지도록 배정합니다.
        </p>
      </section>
      <section className={card}>
        <StatefulForm action={saveSettingsAction} submitLabel="설정 저장">
          <div className="grid gap-6 md:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name}>
                <label htmlFor={f.name} className={label}>
                  {f.text}
                </label>
                <input
                  id={f.name}
                  name={f.name}
                  type="number"
                  step={f.step ?? "1"}
                  min="0"
                  required
                  defaultValue={s[f.name]}
                  className={input}
                />
                <p className={hint}>{f.note}</p>
              </div>
            ))}
          </div>
        </StatefulForm>
      </section>
    </div>
  );
}
