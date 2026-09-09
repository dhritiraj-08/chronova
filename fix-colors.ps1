$files = Get-ChildItem -Path "c:\Chronova ai\chronova-ai\app" -Recurse -Include "*.tsx","*.ts","*.css"
foreach ($f in $files) {
  $c = [System.IO.File]::ReadAllText($f.FullName)
  $c = $c.Replace("#7c3aed",  "#f97316")
  $c = $c.Replace("#6d28d9",  "#ea580c")
  $c = $c.Replace("#8b5cf6",  "#f97316")
  $c = $c.Replace("#a78bfa",  "#fdba74")
  $c = $c.Replace("#c4b5fd",  "#fed7aa")
  $c = $c.Replace("#9070ff",  "#fb923c")
  $c = $c.Replace("rgba(124,58,237,0.5)",  "rgba(249,115,22,0.4)")
  $c = $c.Replace("rgba(124,58,237,0.4)",  "rgba(249,115,22,0.3)")
  $c = $c.Replace("rgba(124,58,237,0.3)",  "rgba(249,115,22,0.22)")
  $c = $c.Replace("rgba(124,58,237,0.25)", "rgba(249,115,22,0.18)")
  $c = $c.Replace("rgba(124,58,237,0.2)",  "rgba(249,115,22,0.14)")
  $c = $c.Replace("rgba(124,58,237,0.15)", "rgba(249,115,22,0.11)")
  $c = $c.Replace("rgba(124,58,237,0.12)", "rgba(249,115,22,0.09)")
  $c = $c.Replace("rgba(124,58,237,0.1)",  "rgba(249,115,22,0.08)")
  $c = $c.Replace("rgba(124,58,237,0.08)", "rgba(249,115,22,0.06)")
  $c = $c.Replace("rgba(124,58,237,0.05)", "rgba(249,115,22,0.04)")
  [System.IO.File]::WriteAllText($f.FullName, $c)
  Write-Host "Fixed: $($f.Name)"
}
Write-Host "All done!"
