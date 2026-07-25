import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export const launchDriverTour = (tourSteps = [], onComplete = null) => {
  if (!tourSteps || tourSteps.length === 0) {
    alert('Bài học này chưa cấu hình tour tương tác trên màn hình thật!');
    return;
  }

  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayColor: 'rgba(15, 23, 42, 0.75)',
    nextBtnText: 'Tiếp tục ➔',
    prevBtnText: '◄ Quay lại',
    doneBtnText: 'Hoàn thành Tour 🎉',
    onDestroyStarted: () => {
      if (onComplete) onComplete();
      driverObj.destroy();
    },
    steps: tourSteps.map(step => ({
      element: step.element,
      popover: {
        title: step.popover?.title || 'Hướng dẫn thao tác',
        description: step.popover?.description || '',
        side: step.popover?.side || 'bottom',
        align: 'start'
      }
    }))
  });

  driverObj.drive();
};
