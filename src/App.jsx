import { useState, useEffect } from "react";
import { db } from "./firebase";
import { ref, onValue, push, set, remove } from "firebase/database";

// ── 날짜 포맷 ──────────────────────────────────────────
function formatDateTime(ts) {
  const d = new Date(ts);
  const days = ["일","월","화","수","목","금","토"];
  return `${d.getMonth()+1}/${d.getDate()}(${days[d.getDay()]}) ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function formatMoney(v) {
  const n = parseInt(v.replace(/,/g,""), 10);
  if (isNaN(n)) return v;
  return n.toLocaleString("ko-KR");
}

// ── 확인 모달 ──────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#1c1c1e", borderRadius:20, padding:28, width:"100%", maxWidth:320, textAlign:"center" }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
        <div style={{ fontSize:16, fontWeight:700, color:"#f8fafc", marginBottom:8 }}>{message}</div>
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button onClick={onCancel}
            style={{ flex:1, background:"#2c2c2e", border:"none", color:"#94a3b8", borderRadius:12, padding:"14px", fontSize:15, fontWeight:700, cursor:"pointer" }}>취소</button>
          <button onClick={onConfirm}
            style={{ flex:1, background:"linear-gradient(135deg,#ef4444,#dc2626)", border:"none", color:"#fff", borderRadius:12, padding:"14px", fontSize:15, fontWeight:700, cursor:"pointer" }}>삭제</button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("unpaid"); // unpaid | memo
  const [unpaidList, setUnpaidList] = useState([]);
  const [memoList, setMemoList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmTarget, setConfirmTarget] = useState(null); // { type, id, label }

  // 미수금 폼
  const [uName, setUName] = useState("");
  const [uAmount, setUAmount] = useState("");
  const [uPhone, setUPhone] = useState("");
  const [uNote, setUNote] = useState("");
  const [showUnpaidForm, setShowUnpaidForm] = useState(false);

  // 메모 폼
  const [memoText, setMemoText] = useState("");
  const [showMemoForm, setShowMemoForm] = useState(false);

  // ── Firebase 구독 ──
  useEffect(() => {
    const unsubU = onValue(ref(db, "unpaid"), snap => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([id, v]) => ({ id, ...v }));
        list.sort((a,b) => b.createdAt - a.createdAt);
        setUnpaidList(list);
      } else setUnpaidList([]);
      setLoading(false);
    });
    const unsubM = onValue(ref(db, "memos"), snap => {
      const data = snap.val();
      if (data) {
        const list = Object.entries(data).map(([id, v]) => ({ id, ...v }));
        list.sort((a,b) => b.createdAt - a.createdAt);
        setMemoList(list);
      } else setMemoList([]);
    });
    return () => { unsubU(); unsubM(); };
  }, []);

  // ── 미수금 추가 ──
  const addUnpaid = () => {
    if (!uName.trim() || !uAmount.trim()) return;
    const newRef = push(ref(db, "unpaid"));
    set(newRef, {
      name: uName.trim(),
      amount: uAmount.replace(/,/g,""),
      phone: uPhone.trim(),
      note: uNote.trim(),
      createdAt: Date.now(),
    });
    setUName(""); setUAmount(""); setUPhone(""); setUNote("");
    setShowUnpaidForm(false);
  };

  // ── 메모 추가 ──
  const addMemo = () => {
    if (!memoText.trim()) return;
    const newRef = push(ref(db, "memos"));
    set(newRef, { text: memoText.trim(), createdAt: Date.now() });
    setMemoText(""); setShowMemoForm(false);
  };

  // ── 삭제 ──
  const deleteItem = (type, id) => remove(ref(db, `${type}/${id}`));

  const totalUnpaid = unpaidList.reduce((s, u) => s + parseInt(u.amount||0, 10), 0);

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"#111", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <div style={{ width:40, height:40, border:"3px solid #222", borderTop:"3px solid #f59e0b", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
      <div style={{ color:"#555", fontSize:14 }}>불러오는 중...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#111", fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif", color:"#f8fafc", paddingBottom:100 }}>

      {/* ── 헤더 ── */}
      <div style={{ background:"#1c1c1e", padding:"18px 20px 0", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <div style={{ width:36, height:36, background:"linear-gradient(135deg,#f59e0b,#ef4444)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🚛</div>
          <div>
            <div style={{ fontWeight:900, fontSize:17, letterSpacing:"-0.3px" }}>배달 메모장</div>
            <div style={{ fontSize:11, color:"#555", marginTop:1 }}>미수금 · 메모 관리</div>
          </div>
        </div>
        {/* 탭 */}
        <div style={{ display:"flex", gap:0, borderBottom:"2px solid #2c2c2e" }}>
          {[
            { key:"unpaid", label:`💰 미수금`, badge: unpaidList.length },
            { key:"memo",   label:`📝 메모`,   badge: memoList.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex:1, padding:"12px 8px", border:"none", background:"transparent", cursor:"pointer",
                color: tab===t.key?"#f59e0b":"#555",
                fontWeight: tab===t.key?900:600, fontSize:14,
                borderBottom: tab===t.key?"2px solid #f59e0b":"2px solid transparent",
                marginBottom:-2, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              {t.label}
              {t.badge > 0 && (
                <span style={{ background: tab===t.key?"#f59e0b":"#333", color: tab===t.key?"#000":"#888", borderRadius:20, padding:"1px 7px", fontSize:11, fontWeight:800 }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 16px 0" }}>

        {/* ════════════════════════════════
            탭 1 — 미수금
        ════════════════════════════════ */}
        {tab === "unpaid" && (
          <div>
            {/* 합계 배너 */}
            {unpaidList.length > 0 && (
              <div style={{ background:"linear-gradient(135deg,#7c2d12,#991b1b)", borderRadius:16, padding:"16px 20px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:12, color:"#fca5a5", fontWeight:600 }}>총 미수금</div>
                  <div style={{ fontSize:26, fontWeight:900, color:"#fff", marginTop:2 }}>
                    {totalUnpaid.toLocaleString("ko-KR")}원
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:12, color:"#fca5a5" }}>{unpaidList.length}건 대기중</div>
                  <div style={{ fontSize:28, marginTop:4 }}>💸</div>
                </div>
              </div>
            )}

            {/* 추가 폼 */}
            {showUnpaidForm && (
              <div style={{ background:"#1c1c1e", borderRadius:16, padding:18, marginBottom:14, border:"1px solid #f59e0b44" }}>
                <div style={{ fontSize:14, fontWeight:800, color:"#f59e0b", marginBottom:14 }}>➕ 미수금 등록</div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  <div style={{ display:"flex", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>고객 이름 *</div>
                      <input value={uName} onChange={e=>setUName(e.target.value)}
                        placeholder="홍길동"
                        style={{ width:"100%", background:"#0f0f0f", border:"1px solid #2c2c2e", borderRadius:10, padding:"12px", color:"#f8fafc", fontSize:15, outline:"none" }} />
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>배송비 *</div>
                      <input value={uAmount} onChange={e=>setUAmount(e.target.value)}
                        placeholder="50000"
                        type="number" inputMode="numeric"
                        style={{ width:"100%", background:"#0f0f0f", border:"1px solid #2c2c2e", borderRadius:10, padding:"12px", color:"#f8fafc", fontSize:15, outline:"none" }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>전화번호</div>
                    <input value={uPhone} onChange={e=>setUPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      type="tel" inputMode="tel"
                      style={{ width:"100%", background:"#0f0f0f", border:"1px solid #2c2c2e", borderRadius:10, padding:"12px", color:"#f8fafc", fontSize:15, outline:"none" }} />
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>특이사항</div>
                    <textarea value={uNote} onChange={e=>setUNote(e.target.value)}
                      placeholder="예: 2층 계단 배송, 내일 오전 입금 예정..."
                      rows={2}
                      style={{ width:"100%", background:"#0f0f0f", border:"1px solid #2c2c2e", borderRadius:10, padding:"12px", color:"#f8fafc", fontSize:14, outline:"none", resize:"none" }} />
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:4 }}>
                    <button onClick={() => { setShowUnpaidForm(false); setUName(""); setUAmount(""); setUPhone(""); setUNote(""); }}
                      style={{ flex:1, background:"#2c2c2e", border:"none", color:"#94a3b8", borderRadius:12, padding:"14px", fontSize:14, fontWeight:700, cursor:"pointer" }}>취소</button>
                    <button onClick={addUnpaid}
                      style={{ flex:2, background:"linear-gradient(135deg,#f59e0b,#d97706)", border:"none", color:"#000", borderRadius:12, padding:"14px", fontSize:15, fontWeight:900, cursor:"pointer" }}>등록</button>
                  </div>
                </div>
              </div>
            )}

            {/* 목록 */}
            {unpaidList.length === 0 && !showUnpaidForm ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"#333" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>💰</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#444" }}>미수금이 없어요!</div>
                <div style={{ fontSize:13, marginTop:6, color:"#333" }}>아래 버튼으로 등록하세요</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {unpaidList.map(u => (
                  <div key={u.id} style={{ background:"#1c1c1e", borderRadius:16, overflow:"hidden", border:"1px solid #2c2c2e" }}>
                    {/* 카드 상단 */}
                    <div style={{ padding:"14px 16px", display:"flex", alignItems:"flex-start", gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#92400e,#b45309)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>👤</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                          <div style={{ fontWeight:900, fontSize:17, color:"#f8fafc" }}>{u.name}</div>
                          <div style={{ fontWeight:900, fontSize:18, color:"#f59e0b", whiteSpace:"nowrap" }}>{parseInt(u.amount).toLocaleString("ko-KR")}원</div>
                        </div>
                        {u.phone && (
                          <a href={`tel:${u.phone}`} style={{ fontSize:13, color:"#60a5fa", marginTop:3, display:"block", textDecoration:"none" }}>📞 {u.phone}</a>
                        )}
                        {u.note && (
                          <div style={{ fontSize:13, color:"#64748b", marginTop:4, background:"#0f0f0f", borderRadius:8, padding:"6px 10px" }}>💬 {u.note}</div>
                        )}
                        <div style={{ fontSize:11, color:"#334155", marginTop:6 }}>등록: {formatDateTime(u.createdAt)}</div>
                      </div>
                    </div>
                    {/* 입금완료 버튼 */}
                    <button
                      onClick={() => setConfirmTarget({ type:"unpaid", id:u.id, label:`${u.name} (${parseInt(u.amount).toLocaleString()}원)` })}
                      style={{ width:"100%", background:"linear-gradient(135deg,#065f46,#047857)", border:"none", color:"#34d399", padding:"14px", fontSize:15, fontWeight:900, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, letterSpacing:"-0.2px" }}>
                      ✅ 입금 완료 — 삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════
            탭 2 — 메모
        ════════════════════════════════ */}
        {tab === "memo" && (
          <div>
            {/* 메모 입력 폼 */}
            {showMemoForm && (
              <div style={{ background:"#1c1c1e", borderRadius:16, padding:18, marginBottom:14, border:"1px solid #3b82f644" }}>
                <div style={{ fontSize:14, fontWeight:800, color:"#60a5fa", marginBottom:12 }}>📝 메모 작성</div>
                <textarea value={memoText} onChange={e=>setMemoText(e.target.value)}
                  placeholder="기억할 내용을 입력하세요..."
                  rows={4} autoFocus
                  style={{ width:"100%", background:"#0f0f0f", border:"1px solid #2c2c2e", borderRadius:10, padding:"12px", color:"#f8fafc", fontSize:15, outline:"none", resize:"none" }} />
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button onClick={() => { setShowMemoForm(false); setMemoText(""); }}
                    style={{ flex:1, background:"#2c2c2e", border:"none", color:"#94a3b8", borderRadius:12, padding:"14px", fontSize:14, fontWeight:700, cursor:"pointer" }}>취소</button>
                  <button onClick={addMemo}
                    style={{ flex:2, background:"linear-gradient(135deg,#3b82f6,#2563eb)", border:"none", color:"#fff", borderRadius:12, padding:"14px", fontSize:15, fontWeight:900, cursor:"pointer" }}>저장</button>
                </div>
              </div>
            )}

            {/* 메모 목록 */}
            {memoList.length === 0 && !showMemoForm ? (
              <div style={{ textAlign:"center", padding:"60px 20px", color:"#333" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📝</div>
                <div style={{ fontSize:16, fontWeight:700, color:"#444" }}>메모가 없어요!</div>
                <div style={{ fontSize:13, marginTop:6, color:"#333" }}>아래 버튼으로 메모를 추가하세요</div>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {memoList.map(m => (
                  <div key={m.id} style={{ background:"#1c1c1e", borderRadius:16, overflow:"hidden", border:"1px solid #2c2c2e" }}>
                    <div style={{ padding:"16px" }}>
                      {/* 포스트잇 느낌 노란 왼쪽 선 */}
                      <div style={{ display:"flex", gap:12 }}>
                        <div style={{ width:4, borderRadius:4, background:"linear-gradient(180deg,#fbbf24,#f59e0b)", flexShrink:0 }} />
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:15, color:"#f8fafc", lineHeight:1.6, whiteSpace:"pre-wrap", wordBreak:"break-all" }}>{m.text}</div>
                          <div style={{ fontSize:11, color:"#334155", marginTop:8 }}>{formatDateTime(m.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                    {/* 완료(삭제) 버튼 */}
                    <button
                      onClick={() => setConfirmTarget({ type:"memos", id:m.id, label:"이 메모" })}
                      style={{ width:"100%", background:"linear-gradient(135deg,#1e3a5f,#1e40af)", border:"none", color:"#93c5fd", padding:"14px", fontSize:15, fontWeight:900, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      🗑️ 완료 — 삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 하단 고정 추가 버튼 ── */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, padding:"12px 16px", background:"linear-gradient(transparent, #111 40%)", pointerEvents:"none" }}>
        <button
          onClick={() => { if (tab==="unpaid") setShowUnpaidForm(v=>!v); else setShowMemoForm(v=>!v); }}
          style={{ width:"100%", pointerEvents:"auto",
            background: tab==="unpaid"
              ? "linear-gradient(135deg,#f59e0b,#d97706)"
              : "linear-gradient(135deg,#3b82f6,#2563eb)",
            border:"none", color: tab==="unpaid"?"#000":"#fff",
            borderRadius:16, padding:"18px", fontSize:17, fontWeight:900,
            cursor:"pointer", boxShadow: tab==="unpaid"?"0 4px 24px rgba(245,158,11,0.4)":"0 4px 24px rgba(59,130,246,0.4)",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {tab==="unpaid" ? "➕ 미수금 등록" : "✏️ 메모 추가"}
        </button>
      </div>

      {/* ── 삭제 확인 모달 ── */}
      {confirmTarget && (
        <ConfirmModal
          message={`${confirmTarget.label}을(를) 삭제할까요?`}
          onConfirm={() => { deleteItem(confirmTarget.type, confirmTarget.id); setConfirmTarget(null); }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}

      <style>{`
        input::placeholder, textarea::placeholder { color: #333; }
        button:active { opacity: 0.85; transform: scale(0.98); }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  );
}
