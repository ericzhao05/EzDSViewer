import React, { useState, useEffect, useRef } from 'react';

function StackView() {
  const [stack, setStack] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [animatingItemId, setAnimatingItemId] = useState(null);
  const [removingItemId, setRemovingItemId] = useState(null);
  
  // Reference to keep track of whether we're animating
  const isAnimating = useRef(false);

  // Load initial stack state when component mounts
  useEffect(() => {
    fetch('http://127.0.0.1:5000/api/stack')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch stack data');
        }
        return response.json();
      })
      .then(data => {
        setStack(data.stack);
      })
      .catch(error => {
        console.error('Error fetching stack:', error);
        setError('Could not load stack data. Make sure the backend is running.');
      });
  }, []);

  // Push to stack with animation
  const handlePush = () => {
    if (!inputValue.trim()) {
      setError('Please enter a value to push');
      return;
    }
    
    if (isAnimating.current) {
      return; // Don't allow new push while animating
    }
    
    setLoading(true);
    setError('');
    
    // Generate a unique ID for the new item for animation tracking
    const newItemId = Date.now().toString();
    
    // Set animating flag
    isAnimating.current = true;
    
    fetch('http://127.0.0.1:5000/api/stack/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value: inputValue }),
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.error || 'Failed to push to stack');
          });
        }
        return response.json();
      })
      .then(data => {
        // Instead of immediately updating the stack, we prepare for animation
        const newStack = data.stack;
        
        // The new item is the last one in the stack
        if (newStack.length > 0) {
          setAnimatingItemId(newItemId);
          
          // Update the stack with our temporary array that includes animation data
          const stackWithAnimationData = newStack.map((item, index) => {
            // Mark the newly added item
            if (index === newStack.length - 1) {
              return { value: item, id: newItemId, isNew: true };
            }
            // Preserve existing IDs for other items or assign new ones
            const existingItem = stack.length > index ? stack[index] : null;
            return {
              value: item,
              id: existingItem && existingItem.id ? existingItem.id : `stack-item-${index}`,
              isNew: false
            };
          });
          
          setStack(stackWithAnimationData);
          setInputValue('');
          
          // Reset the animation state after animation completes
          setTimeout(() => {
            setAnimatingItemId(null);
            isAnimating.current = false;
          }, 1100); // A bit longer than the animation duration
        }
      })
      .catch(error => {
        console.error('Error pushing to stack:', error);
        setError(error.message || 'Failed to push to stack');
        isAnimating.current = false;
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Pop from stack with animation
  const handlePop = () => {
    if (isAnimating.current || stack.length === 0) {
      return; // Don't allow pop while animating or if stack is empty
    }
    
    setLoading(true);
    setError('');
    
    // Set animating flag
    isAnimating.current = true;
    
    // Get the item we're about to pop (for animation)
    const itemToPop = stack[stack.length - 1];
    setRemovingItemId(itemToPop.id || 'popping-item');
    
    // Wait for animation to start before sending API request
    setTimeout(() => {
      fetch('http://127.0.0.1:5000/api/stack/pop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })
        .then(response => {
          if (!response.ok) {
            return response.json().then(data => {
              throw new Error(data.error || 'Failed to pop from stack');
            });
          }
          return response.json();
        })
        .then(data => {
          // Allow animation to complete before updating state
          setTimeout(() => {
            // Update stack with IDs preserved
            const newStack = data.stack.map((item, index) => {
              const existingItem = stack.length > index ? stack[index] : null;
              return {
                value: item,
                id: existingItem && existingItem.id ? existingItem.id : `stack-item-${index}`,
                isNew: false
              };
            });
            
            setStack(newStack);
            setRemovingItemId(null);
            isAnimating.current = false;
          }, 700); // Animation duration
        })
        .catch(error => {
          console.error('Error popping from stack:', error);
          setError(error.message || 'Failed to pop from stack');
          setRemovingItemId(null);
          isAnimating.current = false;
        })
        .finally(() => {
          setLoading(false);
        });
    }, 50); // Small delay to ensure animation starts
  };

  // Add a new function to test the API connection
  const testApiConnection = () => {
    setError('');
    setLoading(true);
    
    fetch('http://127.0.0.1:5000/api/data')
      .then(response => response.json())
      .then(data => {
        alert('API connection successful! Response: ' + JSON.stringify(data));
        setError('');
      })
      .catch(error => {
        console.error('API test failed:', error);
        setError('API connection failed. Check your browser console for details.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="ds-container">
      <h2>Stack Visualization</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="stack-visualization">
        {stack.length === 0 ? (
          <p className="empty-message">Stack is empty. Push some elements!</p>
        ) : (
          <div className="stack-items">
            {stack.map((item, index) => (
              <div 
                key={item.id || `stack-item-${index}`}
                className={`stack-item ${
                  animatingItemId === item.id ? 'new-item' : ''
                } ${
                  removingItemId === item.id ? 'remove-item' : ''
                }`}
              >
                {item.value}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="ds-controls">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter value to push"
          onKeyDown={(e) => e.key === 'Enter' && !isAnimating.current && handlePush()}
          disabled={loading || isAnimating.current}
        />
        <button 
          className="control-btn push-btn" 
          onClick={handlePush}
          disabled={loading || isAnimating.current}
        >
          {loading && !isAnimating.current ? 'Pushing...' : 'Push'}
        </button>
        <button 
          className="control-btn pop-btn" 
          onClick={handlePop}
          disabled={loading || isAnimating.current || stack.length === 0}
        >
          {loading && !isAnimating.current ? 'Popping...' : 'Pop'}
        </button>
      </div>
      
      <div className="debug-info">
        <p>Backend URL: http://127.0.0.1:5000</p>
        <p>API endpoint: /api/stack/push (POST)</p>
        <button 
          onClick={testApiConnection} 
          className="test-api-btn"
        >
          Test API Connection
        </button>
      </div>
    </div>
  );
}

export default StackView;
