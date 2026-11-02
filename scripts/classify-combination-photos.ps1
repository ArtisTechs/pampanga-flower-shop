# Measures the wrapping paper and ribbon color of every combination photo and writes a manifest for
# `npm run combinations:import` (backend), which turns the colors into palettes. Read-only: it never changes or
# uploads the photos.
#   ./scripts/classify-combination-photos.ps1 -Root "D:\COMBINATIONS-...\COMBINATIONS" -Out combinations-manifest.json
#
# A folder holds the same bouquet in several paper colors, so the flowers and backdrop are the same in every photo.
# The per-pixel median of the folder's photos is therefore "everything except the paper"; the pixels where a photo
# differs from it are that photo's paper and ribbon, and their median color is what gets recorded.
param(
  [Parameter(Mandatory = $true)][string]$Root,
  [string]$Out = "combinations-manifest.json"
)

Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;

public static class PaperColor
{
    const int Width = 120;
    const double MinDifference = 60;

    static byte[] Pixels(string file, int height)
    {
        using (var source = Image.FromFile(file))
        using (var bitmap = new Bitmap(Width, height, PixelFormat.Format24bppRgb))
        {
            using (var graphics = Graphics.FromImage(bitmap))
            {
                graphics.DrawImage(source, 0, 0, Width, height);
            }
            var data = bitmap.LockBits(new Rectangle(0, 0, Width, height), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
            var bytes = new byte[Math.Abs(data.Stride) * height];
            System.Runtime.InteropServices.Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);
            bitmap.UnlockBits(data);
            var packed = new byte[Width * height * 3];
            for (int y = 0; y < height; y++)
            {
                for (int x = 0; x < Width; x++)
                {
                    int from = y * data.Stride + x * 3, to = (y * Width + x) * 3;
                    packed[to] = bytes[from + 2]; packed[to + 1] = bytes[from + 1]; packed[to + 2] = bytes[from];
                }
            }
            return packed;
        }
    }

    static int Median(List<int> values)
    {
        values.Sort();
        return values[values.Count / 2];
    }

    // Returns {r, g, b, pixelCount} per file, or null when the photo barely differs from the folder median.
    public static int[][] Measure(string[] files)
    {
        int height;
        using (var first = Image.FromFile(files[0])) { height = (int)Math.Round(first.Height * (double)Width / first.Width); }
        var photos = new byte[files.Length][];
        for (int i = 0; i < files.Length; i++) { photos[i] = Pixels(files[i], height); }

        var median = new byte[Width * height * 3];
        var column = new int[files.Length];
        for (int p = 0; p < median.Length; p++)
        {
            for (int i = 0; i < files.Length; i++) { column[i] = photos[i][p]; }
            Array.Sort(column);
            median[p] = (byte)column[files.Length / 2];
        }

        var result = new int[files.Length][];
        for (int i = 0; i < files.Length; i++)
        {
            var reds = new List<int>(); var greens = new List<int>(); var blues = new List<int>();
            for (int p = 0; p < Width * height; p++)
            {
                double dr = photos[i][p * 3] - median[p * 3], dg = photos[i][p * 3 + 1] - median[p * 3 + 1], db = photos[i][p * 3 + 2] - median[p * 3 + 2];
                if (Math.Sqrt(dr * dr + dg * dg + db * db) > MinDifference)
                {
                    reds.Add(photos[i][p * 3]); greens.Add(photos[i][p * 3 + 1]); blues.Add(photos[i][p * 3 + 2]);
                }
            }
            result[i] = reds.Count < 150 ? null : new[] { Median(reds), Median(greens), Median(blues), reds.Count };
        }
        return result;
    }
}
"@

$rootPath = (Resolve-Path $Root).Path
$rows = New-Object System.Collections.Generic.List[object]
$folders = Get-ChildItem $rootPath -Recurse -Directory | Where-Object { (Get-ChildItem $_.FullName -File).Count -gt 0 }

foreach ($folder in $folders) {
  $files = @(Get-ChildItem $folder.FullName -File | Where-Object { $_.Extension -match '^\.(jfif|jpe|jpg|jpeg|png)$' })
  $measured = $null; $failure = $null
  try { $measured = [PaperColor]::Measure([string[]]($files | ForEach-Object { $_.FullName })) } catch { $failure = $_.Exception.Message }
  for ($i = 0; $i -lt $files.Count; $i++) {
    $color = if ($measured) { $measured[$i] } else { $null }
    $relative = $files[$i].FullName.Substring($rootPath.Length + 1).Replace('\', '/')
    $problem = $null
    if ($failure) { $problem = $failure } elseif (-not $color) { $problem = "barely differs from the other photos in its folder" }
    $rgb = $null; $pixels = 0
    if ($color) { $rgb = @($color[0], $color[1], $color[2]); $pixels = $color[3] }
    $rows.Add([pscustomobject]@{ path = $relative; bytes = $files[$i].Length; rgb = $rgb; pixels = $pixels; error = $problem })
  }
}

[pscustomobject]@{ root = $rootPath; files = $rows } | ConvertTo-Json -Depth 5 | Set-Content -Path $Out -Encoding utf8
"$($rows.Count) photos in $($folders.Count) folders -> $Out; unreadable: $(($rows | Where-Object error).Count)"
