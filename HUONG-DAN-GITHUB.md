# Đưa web lên GitHub Pages

1. Vào github.com, tạo repository mới (ví dụ `on-thi-tn-thpt`), để Public.
2. Giải nén file zip, rồi tải toàn bộ thư mục lên repo (nút "Add file" > "Upload files"; nhớ kéo cả thư mục `.github`).
   Hoặc dùng lệnh:
   git init && git add . && git commit -m "first commit"
   git branch -M main
   git remote add origin https://github.com/<ten-ban>/<ten-repo>.git
   git push -u origin main
3. Trong repo: Settings > Pages > mục "Build and deployment", chọn Source = **GitHub Actions**.
4. Vào tab Actions, chờ workflow "Deploy to GitHub Pages" chạy xong (khoảng 2-3 phút).
5. Web chạy tại: https://<ten-ban>.github.io/<ten-repo>/

Mỗi lần đẩy code mới lên nhánh `main`, web tự cập nhật.
