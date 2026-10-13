import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, formatEther, isAddress, parseEther } from "ethers";
import { ArrowUpRight, Check, Clock3, Landmark, Plus, RefreshCw, ShieldCheck, Users, Vote, Wallet } from "lucide-react";
import contractData from "./contract/DominionDAO.json";

const short = (value = "") => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "";
const eth = (value) => Number(formatEther(value ?? 0n)).toLocaleString("vi-VN", { maximumFractionDigits: 4 });
const date = (seconds) => new Date(Number(seconds) * 1000).toLocaleString("vi-VN");
const errorText = (error) => error?.shortMessage || error?.reason || error?.message || "Giao dịch thất bại";

function App() {
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [daoBalance, setDaoBalance] = useState(0n);
  const [myBalance, setMyBalance] = useState(0n);
  const [stakeholder, setStakeholder] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [filter, setFilter] = useState("all");
  const [contribution, setContribution] = useState("0.01");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", beneficiary: "", amount: "0.005" });

  const flash = (message, type = "success") => {
    setNotice({ message, type });
    window.setTimeout(() => setNotice(null), 4500);
  };

  const connect = useCallback(async () => {
    if (!window.ethereum) return flash("Vui lòng cài MetaMask để tiếp tục.", "error");
    try {
      const nextProvider = new BrowserProvider(window.ethereum);
      await nextProvider.send("eth_requestAccounts", []);
      const signer = await nextProvider.getSigner();
      const network = await nextProvider.getNetwork();
      if (!contractData.address || !contractData.abi.length) {
        return flash("Chưa có địa chỉ contract. Hãy chạy script deploy trước.", "error");
      }
      setProvider(nextProvider);
      setAccount(await signer.getAddress());
      setChainId(Number(network.chainId));
      setContract(new Contract(contractData.address, contractData.abi, signer));
    } catch (error) { flash(errorText(error), "error"); }
  }, []);

  const loadData = useCallback(async () => {
    if (!contract || !account) return;
    try {
      const [fund, mine, role, rows] = await Promise.all([
        contract.daoBalance(), contract.getBalance(account), contract.isStakeholder(account), contract.getProposals()
      ]);
      setDaoBalance(fund); setMyBalance(mine); setStakeholder(role); setProposals(rows);
    } catch (error) { flash(errorText(error), "error"); }
  }, [contract, account]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (!window.ethereum) return;
    const reload = () => window.location.reload();
    window.ethereum.on("accountsChanged", reload);
    window.ethereum.on("chainChanged", reload);
    return () => {
      window.ethereum.removeListener("accountsChanged", reload);
      window.ethereum.removeListener("chainChanged", reload);
    };
  }, []);

  const transact = async (work, pending, done) => {
    try {
      setLoading(true); flash(pending, "pending");
      const tx = await work(); await tx.wait(); await loadData(); flash(done);
    } catch (error) { flash(errorText(error), "error"); }
    finally { setLoading(false); }
  };

  const contribute = () => {
    if (!contract || !contribution || Number(contribution) <= 0) return flash("Nhập số ETH hợp lệ.", "error");
    transact(() => contract.contribute({ value: parseEther(contribution) }), "Đang chờ xác nhận đóng góp…", "Đóng góp thành công!");
  };

  const createProposal = (event) => {
    event.preventDefault();
    if (!isAddress(form.beneficiary)) return flash("Địa chỉ người nhận không hợp lệ.", "error");
    transact(
      () => contract.createProposal(form.title, form.description, form.beneficiary, parseEther(form.amount)),
      "Đang tạo đề xuất…",
      "Đề xuất đã được tạo."
    );
    setShowModal(false);
  };

  const now = Math.floor(Date.now() / 1000);
  const visible = useMemo(() => proposals.filter((p) => {
    if (filter === "open") return Number(p.deadline) > now && !p.paid;
    if (filter === "closed") return Number(p.deadline) <= now || p.paid;
    return true;
  }), [proposals, filter, now]);

  return (
    <div className="app-shell">
      <header>
        <a className="brand" href="#top"><span className="brand-mark">D</span><span>DOMINION<span className="muted"> / PTIT DAO</span></span></a>
        <div className="header-actions">
          {chainId && <span className="network"><i />{chainId === 11155111 ? "Sepolia" : `Chain ${chainId}`}</span>}
          <button className="wallet-button" onClick={connect}><Wallet size={17}/>{account ? short(account) : "Kết nối ví"}</button>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="eyebrow"><ShieldCheck size={15}/> QUẢN TRỊ MINH BẠCH TRÊN ETHEREUM</div>
          <h1>Quỹ chung.<br/><span>Quyết định chung.</span></h1>
          <p>Đóng góp, đề xuất và biểu quyết chi tiêu bằng smart contract. Mỗi giao dịch đều công khai, có thể kiểm chứng và không thể sửa đổi.</p>
          <div className="hero-actions">
            <button className="primary" onClick={connect}>{account ? "Ví đã kết nối" : "Bắt đầu với MetaMask"}<ArrowUpRight size={18}/></button>
            <span className="contract-label">CONTRACT <b>{contractData.address ? short(contractData.address) : "chưa deploy"}</b></span>
          </div>
        </section>

        <section className="stats">
          <article><Landmark/><span>QUỸ DAO</span><strong>{eth(daoBalance)} <small>ETH</small></strong></article>
          <article><Users/><span>ĐÃ ĐÓNG GÓP</span><strong>{eth(myBalance)} <small>ETH</small></strong></article>
          <article><Vote/><span>ĐỀ XUẤT</span><strong>{proposals.length}</strong></article>
          <article><ShieldCheck/><span>VAI TRÒ</span><strong className="role">{stakeholder ? "Stakeholder" : account ? "Contributor" : "Chưa kết nối"}</strong></article>
        </section>

        <section className="workspace">
          <div className="contribute-card">
            <div><span className="section-kicker">GÓP QUỸ</span><h2>Trở thành Stakeholder</h2><p>Đóng góp tổng cộng tối thiểu 0.01 ETH để mở quyền tạo đề xuất và biểu quyết.</p></div>
            <div className="amount-row"><div className="input-wrap"><input value={contribution} onChange={(e) => setContribution(e.target.value)} inputMode="decimal"/><span>ETH</span></div><button onClick={contribute} disabled={!account || loading}>Đóng góp</button></div>
            <div className="progress"><div style={{width: `${Math.min(100, Number(formatEther(myBalance)) * 10000)}%`}}/></div>
            <small>{stakeholder ? "Bạn đã đủ điều kiện Stakeholder." : `${eth(myBalance)} / 0,01 ETH`}</small>
          </div>

          <div className="proposal-heading">
            <div><span className="section-kicker">GOVERNANCE</span><h2>Các đề xuất</h2></div>
            <div className="proposal-actions"><button className="icon-button" onClick={loadData} aria-label="Làm mới"><RefreshCw size={17}/></button>{stakeholder && <button className="new-button" onClick={() => setShowModal(true)}><Plus size={17}/>Tạo đề xuất</button>}</div>
          </div>
          <div className="filters">{[["all","Tất cả"],["open","Đang mở"],["closed","Đã đóng"]].map(([key,label]) => <button className={filter === key ? "active" : ""} onClick={() => setFilter(key)} key={key}>{label}</button>)}</div>

          <div className="proposal-grid">
            {visible.length === 0 && <div className="empty"><Vote/><h3>Chưa có đề xuất</h3><p>Đề xuất đầu tiên sẽ xuất hiện tại đây.</p></div>}
            {visible.map((p) => {
              const open = Number(p.deadline) > now;
              const passed = p.upvotes > p.downvotes;
              return <article className="proposal-card" key={String(p.id)}>
                <div className="proposal-top"><span className="proposal-id"># {String(p.id).padStart(2,"0")}</span><span className={`status ${p.paid ? "paid" : open ? "open" : passed ? "passed" : "rejected"}`}>{p.paid ? "Đã thanh toán" : open ? "Đang mở" : passed ? "Đã thông qua" : "Không thông qua"}</span></div>
                <h3>{p.title}</h3><p>{p.description}</p>
                <dl><div><dt>NGƯỜI NHẬN</dt><dd>{short(p.beneficiary)}</dd></div><div><dt>SỐ TIỀN</dt><dd>{eth(p.amount)} ETH</dd></div><div><dt>HẠN BIỂU QUYẾT</dt><dd>{date(p.deadline)}</dd></div></dl>
                <div className="vote-meter"><div className="yes" style={{width: `${Number(p.upvotes) + Number(p.downvotes) === 0 ? 50 : Number(p.upvotes) * 100 / (Number(p.upvotes)+Number(p.downvotes))}%`}}/></div>
                <div className="vote-labels"><span><i className="dot yes-dot"/>Đồng ý <b>{String(p.upvotes)}</b></span><span><i className="dot no-dot"/>Từ chối <b>{String(p.downvotes)}</b></span></div>
                <div className="card-actions">
                  {open && stakeholder && <><button onClick={() => transact(() => contract.performVote(p.id, true), "Đang gửi phiếu…", "Đã bỏ phiếu đồng ý.")}><Check size={16}/>Đồng ý</button><button className="secondary" onClick={() => transact(() => contract.performVote(p.id, false), "Đang gửi phiếu…", "Đã bỏ phiếu từ chối.")}>Từ chối</button></>}
                  {!open && passed && !p.paid && stakeholder && <button onClick={() => transact(() => contract.payBeneficiary(p.id), "Đang thanh toán…", `Thanh toán thành công ${eth(p.amount)} ETH cho ${short(p.beneficiary)}.`)}>Thanh toán</button>}
                  {open && <span className="deadline"><Clock3 size={15}/>Còn {Math.max(0, Math.ceil((Number(p.deadline)-now)/60))} phút</span>}
                </div>
              </article>;
            })}
          </div>
        </section>
      </main>

      <footer><span>DOMINION DAO · PTIT</span><span>Sepolia testnet · Học tập, không dùng tiền thật</span></footer>
      {notice && <div className={`toast ${notice.type}`}>{notice.type === "pending" && <RefreshCw className="spin" size={17}/>} {notice.message}</div>}

      {showModal && <div className="modal-backdrop" onMouseDown={() => setShowModal(false)}><form className="modal" onSubmit={createProposal} onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><span className="section-kicker">ĐỀ XUẤT MỚI</span><h2>Yêu cầu giải ngân</h2></div><button type="button" onClick={() => setShowModal(false)}>×</button></div><label>Tiêu đề<input required value={form.title} onChange={(e) => setForm({...form,title:e.target.value})} placeholder="Ví dụ: Chi phí workshop Web3"/></label><label>Mô tả<textarea required rows="4" value={form.description} onChange={(e) => setForm({...form,description:e.target.value})} placeholder="Mục đích và lý do sử dụng quỹ…"/></label><label>Địa chỉ người nhận<input required value={form.beneficiary} onChange={(e) => setForm({...form,beneficiary:e.target.value})} placeholder="0x…"/></label><label>Số ETH<input required type="number" min="0" step="0.0001" value={form.amount} onChange={(e) => setForm({...form,amount:e.target.value})}/></label><button className="primary submit" disabled={loading}>Tạo đề xuất<ArrowUpRight size={18}/></button><small>Thời gian biểu quyết tự động: 5 phút</small></form></div>}
    </div>
  );
}

export default App;
