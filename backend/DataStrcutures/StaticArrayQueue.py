import ctypes


def make_array(n):
    return (n * ctypes.py_object)()


class StaticArrayQueue:
    def __init__(self, max_cap):
        self.data_arr = make_array(max_cap)
        self.capacity = max_cap
        self.n = 0
        self.front_ind = None

    def __len__(self):
        return self.n

    def is_empty(self):
        return (len(self) == 0)

    def is_full(self):
        return (self.n == self.capacity)

    def enqueue(self, item):
        if(self.is_full()):
            raise Exception("Queue is full")
        elif(self.is_empty()):
            self.data_arr[0] = item
            self.front_ind = 0
            self.n += 1
        else:
            back_ind = (self.front_ind + self.n) % self.capacity
            self.data_arr[back_ind] = item
            self.n += 1

    def dequeue(self):
        if(self.is_empty()):
            raise Exception("Queue is empty")
        value = self.data_arr[self.front_ind]
        self.data_arr[self.front_ind] = None
        self.front_ind = (self.front_ind + 1) % self.capacity
        self.n -= 1
        if(self.is_empty()):
            self.front_ind = None
        return value

    def first(self):
        if(self.is_empty()):
            raise Exception("Queue is empty")
        return self.data_arr[self.front_ind]

    def to_list(self):
        return [self.data_arr[(self.front_ind + i) % self.capacity]
                for i in range(self.n)]
