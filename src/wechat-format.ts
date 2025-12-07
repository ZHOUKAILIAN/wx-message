interface WeatherHourlyData {
  date: string;
  hour: string;
  temp: string;
  condition: string;
  humidity: string;
  windSpeed: string;
  windDir: string;
  pressure: string;
  realFeel: string;
  iconDay: string;
  iconNight: string;
  pop: string;
  uvi: string;
  conditionId: string;
  updatetime: string;
}

interface WeatherResponse {
  hourly: WeatherHourlyData[];
}

export function formatWeatherMessage(data: WeatherResponse, cityName: string): string {
  if (!data.hourly || data.hourly.length === 0) {
    return `❌ ${cityName}暂无天气数据`;
  }

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  
  // 取前8小时的天气数据（更简洁）
  const hourlyData = data.hourly.slice(0, 8);
  
  let message = `📍 ${cityName} 天气预报\n`;
  message += `📅 ${today}\n`;
  message += `─`.repeat(20) + '\n\n';
  
  hourlyData.forEach((hour, index) => {
    // 构建时间显示
    const hourNum = parseInt(hour.hour);
    const timeStr = `${hour.date} ${hourNum.toString().padStart(2, '0')}:00`;
    
    // 天气图标映射
    let weatherIcon = '☁️';
    if (hour.condition.includes('晴')) weatherIcon = '☀️';
    else if (hour.condition.includes('雨')) weatherIcon = '🌧️';
    else if (hour.condition.includes('雪')) weatherIcon = '❄️';
    else if (hour.condition.includes('阴')) weatherIcon = '☁️';
    else if (hour.condition.includes('多云')) weatherIcon = '⛅';
    else if (hour.condition.includes('雾')) weatherIcon = '🌫';
    
    message += `🕐 ${timeStr} ${weatherIcon} ${hour.temp}°C ${hour.condition}\n`;
    message += `💧 湿度${hour.humidity}%  💨 ${hour.windDir}风${hour.windSpeed}级\n`;
    
    // 每隔几个小时换行
    if ((index + 1) % 2 === 0 && index < hourlyData.length - 1) {
      message += '\n';
    }
  });
  
  message += `\n─`.repeat(20) + '\n';
  message += `💡 建议根据天气情况合理安排出行~\n`;
  message += `🔄 数据更新时间: ${new Date().toLocaleTimeString('zh-CN')}`;
  
  return message;
}
