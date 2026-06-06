import React, { useEffect, useState, useRef } from 'react';
import demoScript from '../demoScript';
import { useNavigate } from 'react-router-dom';

export default function AutoDemo() {
  const [renderState, setRenderState] = useState(0); // force renders
  const isActiveRef = useRef(false);
  const cursorPosRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    window.startDemo = () => {
      console.log("Demo started via shortcut");
      isActiveRef.current = true;
      setRenderState(s => s + 1);
      runScript();
    };

    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        window.startDemo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getElementCenter = (selector) => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  };

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  const animateCursor = async (targetX, targetY, duration = 800) => {
    const steps = 30;
    const stepTime = duration / steps;
    const startX = cursorPosRef.current.x;
    const startY = cursorPosRef.current.y;
    
    for (let i = 1; i <= steps; i++) {
      if (!isActiveRef.current) break;
      const progress = i / steps;
      const ease = 1 - Math.pow(1 - progress, 3);
      cursorPosRef.current = {
        x: startX + (targetX - startX) * ease,
        y: startY + (targetY - startY) * ease
      };
      setRenderState(s => s + 1);
      await delay(stepTime);
    }
  };

  const simulateType = async (selector, text) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.focus();
    
    for (let i = 0; i < text.length; i++) {
      if (!isActiveRef.current) break;
      const val = text.substring(0, i + 1);
      
      // Native React value setter override
      const prototype = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (setter) {
        setter.call(el, val);
      } else {
        el.value = val;
      }
      
      const event = new Event('input', { bubbles: true });
      el.dispatchEvent(event);
      await delay(50 + Math.random() * 50);
    }
  };

  const runScript = async () => {
    for (const step of demoScript) {
      if (!isActiveRef.current) break;

      if (step.type === 'wait') {
        await delay(step.ms);
      } else if (step.type === 'move') {
        const pos = getElementCenter(step.selector);
        if (pos) {
          await animateCursor(pos.x, pos.y, step.duration || 800);
        } else {
          console.warn('Demo: Element not found for move:', step.selector);
        }
      } else if (step.type === 'click') {
        const pos = getElementCenter(step.selector);
        if (pos) {
          await animateCursor(pos.x, pos.y, 400);
          await delay(200);
          if (!isActiveRef.current) break;
          const el = document.querySelector(step.selector);
          if (el) el.click();
          await delay(200);
        } else {
          console.warn('Demo: Element not found for click:', step.selector);
        }
      } else if (step.type === 'type') {
        await simulateType(step.selector, step.text);
      } else if (step.type === 'navigate' && window.routerNavigate) {
        window.routerNavigate(step.path);
        await delay(500);
      }
    }
    
    isActiveRef.current = false;
    setRenderState(s => s + 1);
  };

  if (!isActiveRef.current) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: cursorPosRef.current.y,
        left: cursorPosRef.current.x,
        width: '24px',
        height: '24px',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'none',
        transform: 'translate(-50%, -50%)'
      }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 11V3c0-1.1.9-2 2-2s2 .9 2 2v6" />
        <path d="M14 7v1" />
        <path d="M18 9v1" />
        <path d="M22 12v6c0 3.3-2.7 6-6 6h-2c-2.2 0-4.2-1.2-5.3-3l-3.3-5.3c-.6-1-.2-2.3.8-2.9.9-.5 2-.4 2.8.3l1.7 1.5V11" />
      </svg>
    </div>
  );
}