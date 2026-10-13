# DominionDAO - Smart Contract + React Web3

Project hoàn chỉnh cho bài thực hành PTIT: đóng ETH, đạt vai trò Stakeholder, tạo đề xuất, biểu quyết trong 5 phút và giải ngân cho người thụ hưởng.

## Yêu cầu

- Node.js 18 trở lên
- MetaMask
- ETH thử nghiệm trên Sepolia nếu triển khai testnet

## Chạy và kiểm thử local

Mở terminal thứ nhất tại thư mục project:

```bash
npm install
npm test
npm run node
```

Giữ terminal thứ nhất chạy. Mở terminal thứ hai:

```bash
npm run deploy:local
cd frontend
npm install
npm run dev
```

Mở `http://localhost:3000`. Thêm mạng local vào MetaMask:

- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Import một private key thử nghiệm được Hardhat in trong terminal. Chỉ dùng khóa local này; không dùng khóa ví thật.

## Triển khai Sepolia

1. Sao chép `.env.example` thành `.env`.
2. Điền `SEPOLIA_RPC_URL` và `PRIVATE_KEY` của ví thử nghiệm.
3. Chạy:

```bash
npm install
npm run compile
npm run deploy:sepolia
cd frontend
npm install
npm run dev
```

Script deploy tự cập nhật ABI và địa chỉ contract tại `frontend/src/contract/DominionDAO.json`.

## Kịch bản demo nộp bài

1. Mỗi thành viên kết nối cùng mạng và cùng địa chỉ contract.
2. Đóng góp ít nhất `0.01 ETH` để trở thành Stakeholder.
3. Một thành viên tạo đề xuất trả `0.005 ETH` cho địa chỉ A.
4. Các Stakeholder bỏ phiếu Đồng ý hoặc Từ chối.
5. Chờ hết 5 phút, bấm Thanh toán nếu số phiếu Đồng ý cao hơn.
6. Kiểm tra số dư MetaMask của A và trạng thái `Đã thanh toán` trên giao diện.

## Lưu ý an toàn

- `.env` và `deployment.json` đã được loại khỏi Git.
- Không commit private key hoặc seed phrase.
- Đây là project học tập; hãy dùng Sepolia ETH, không dùng tiền thật.
