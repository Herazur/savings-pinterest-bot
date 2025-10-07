const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Tasarruf verilerini oku
const savingsData = JSON.parse(fs.readFileSync('savings-data.json', 'utf8'));

// İstatistikleri hesapla
const totalSaved = savingsData.entries.reduce((sum, entry) => sum + entry.amount, 0);
const goalTarget = savingsData.currentGoal.target;
const goalName = savingsData.currentGoal.name;
const percentage = Math.round((totalSaved / goalTarget) * 100);
const remaining = goalTarget - totalSaved;

console.log(`Total Saved: ${totalSaved} TRY`);
console.log(`Goal: ${goalName} - ${percentage}%`);

// AI ile görsel oluştur
async function generatePinterestImage() {
  const prompt = encodeURIComponent(
    `Professional financial infographic showing savings progress. ` +
    `Turkish Lira currency symbol ₺${totalSaved} saved towards ₺${goalTarget}. ` +
    `Goal: ${goalName}. Progress bar showing ${percentage}%. ` +
    `Modern, clean design with blue and gold colors. ` +
    `Pinterest style vertical image 1000x1500px. ` +
    `Motivational savings tracker aesthetic`
  );

  const imageUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1000&height=1500&nologo=true&model=flux`;
  
  console.log('Generating image with Pollinations.ai...');
  
  try {
    // Görseli indir
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream'
    });

    // Output klasörü oluştur
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Görseli kaydet
    const outputPath = path.join(outputDir, 'pinterest-post.png');
    const writer = fs.createWriteStream(outputPath);
    
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log('Image saved successfully!');
        
        // GitHub Actions output'a yaz
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, 
            `total_saved=${totalSaved}\n` +
            `goal_name=${goalName}\n` +
            `image_url=${imageUrl}\n` +
            `percentage=${percentage}\n`
          );
        }
        
        resolve(outputPath);
      });
      writer.on('error', reject);
    });

  } catch (error) {
    console.error('Error generating image:', error.message);
    throw error;
  }
}

// Pinterest için caption oluştur
function generateCaption() {
  const emojis = ['💰', '🎯', '💵', '📊', '✨'];
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  
  return `${randomEmoji} ${goalName} hedefim için %${percentage} ilerleme kaydettim!\n\n` +
    `📈 Toplam Birikim: ₺${totalSaved.toFixed(2)}\n` +
    `🎯 Hedef: ₺${goalTarget.toFixed(2)}\n` +
    `⏳ Kalan: ₺${remaining.toFixed(2)}\n\n` +
    `#tasarruf #hedefim #parabirikimi #finansalözgürlük #birikim #${goalName.toLowerCase().replace(/\s+/g, '')}`;
}

// Metadata dosyası oluştur
function saveMetadata() {
  const metadata = {
    generatedAt: new Date().toISOString(),
    totalSaved,
    goalName,
    goalTarget,
    percentage,
    remaining,
    caption: generateCaption(),
    imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent('savings progress ' + goalName)}?width=1000&height=1500&nologo=true`
  };

  fs.writeFileSync('output/metadata.json', JSON.stringify(metadata, null, 2));
  console.log('Metadata saved!');
}

// Ana fonksiyon
async function main() {
  try {
    await generatePinterestImage();
    saveMetadata();
    console.log('✅ Pinterest post generation completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
